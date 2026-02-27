-- =====================================================
-- SISTEMA DE PAGOS FASE 1 — SCHEMA COMPLETO
-- Ejecutar TODO en Supabase SQL Editor
-- =====================================================

-- 1. Campo client_number en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS client_number TEXT UNIQUE;

-- 2. Auto-generar client_number para distribuidores existentes
DO $$
DECLARE
    r RECORD;
    seq INT := 1;
BEGIN
    FOR r IN SELECT id FROM profiles WHERE role = 'distributor' AND client_number IS NULL ORDER BY created_at
    LOOP
        UPDATE profiles SET client_number = 'DIST-' || LPAD(seq::TEXT, 3, '0') WHERE id = r.id;
        seq := seq + 1;
    END LOOP;
END;
$$;

-- 3. Trigger: auto-asignar client_number a nuevos distribuidores
CREATE OR REPLACE FUNCTION assign_client_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INT;
BEGIN
    IF NEW.role = 'distributor' AND NEW.client_number IS NULL THEN
        SELECT COALESCE(MAX(CAST(REPLACE(client_number, 'DIST-', '') AS INT)), 0) + 1
        INTO next_num FROM profiles WHERE client_number LIKE 'DIST-%';
        NEW.client_number := 'DIST-' || LPAD(next_num::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_client_number ON profiles;
CREATE TRIGGER trg_assign_client_number
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION assign_client_number();

-- 4. Tabla distributor_payments
CREATE TABLE IF NOT EXISTS distributor_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'transferencia',
    reference TEXT,
    distributor_ref TEXT,  -- auto: client_number
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dp_distributor ON distributor_payments(distributor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dp_status ON distributor_payments(status);

-- 5. RLS
ALTER TABLE distributor_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Distributors see own payments" ON distributor_payments;
CREATE POLICY "Distributors see own payments" ON distributor_payments FOR SELECT
    USING (distributor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Distributors insert own payments" ON distributor_payments;
CREATE POLICY "Distributors insert own payments" ON distributor_payments FOR INSERT
    WITH CHECK (distributor_id = auth.uid());

DROP POLICY IF EXISTS "Admin manage all payments" ON distributor_payments;
CREATE POLICY "Admin manage all payments" ON distributor_payments FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT ALL ON distributor_payments TO authenticated;

-- 6. RPC: Distribuidor registra pago
CREATE OR REPLACE FUNCTION submit_distributor_payment(
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_reference TEXT DEFAULT NULL,
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_receipt_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_order_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_client_number TEXT;
    v_payment_id UUID;
BEGIN
    -- Get client number
    SELECT client_number INTO v_client_number FROM profiles WHERE id = auth.uid();

    INSERT INTO distributor_payments (
        distributor_id, amount, payment_method, reference, distributor_ref,
        payment_date, receipt_url, notes, order_id, status
    ) VALUES (
        auth.uid(), p_amount, p_payment_method, p_reference, v_client_number,
        p_payment_date, p_receipt_url, p_notes, p_order_id, 'pending'
    ) RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'message', 'Pago registrado. Pendiente de aprobación.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Admin aprueba o rechaza pago
CREATE OR REPLACE FUNCTION review_distributor_payment(
    p_payment_id UUID,
    p_action TEXT,  -- 'approve' or 'reject'
    p_rejection_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_payment RECORD;
BEGIN
    SELECT (role = 'admin') INTO v_is_admin FROM profiles WHERE id = auth.uid();
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    SELECT * INTO v_payment FROM distributor_payments WHERE id = p_payment_id AND status = 'pending';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado o ya fue revisado');
    END IF;

    IF p_action = 'approve' THEN
        UPDATE distributor_payments SET
            status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
        WHERE id = p_payment_id;

        -- If linked to an order, also register in order_payments for compatibility
        IF v_payment.order_id IS NOT NULL THEN
            INSERT INTO order_payments (order_id, amount, payment_method, reference, payment_date, notes)
            VALUES (v_payment.order_id, v_payment.amount, v_payment.payment_method,
                    v_payment.reference, v_payment.payment_date, 'Aprobado desde pagos distribuidor');

            -- Update order payment status
            PERFORM update_order_payment_status(v_payment.order_id);
        END IF;

        RETURN jsonb_build_object('success', true, 'message', 'Pago aprobado');
    ELSIF p_action = 'reject' THEN
        UPDATE distributor_payments SET
            status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
            rejection_reason = p_rejection_reason
        WHERE id = p_payment_id;

        RETURN jsonb_build_object('success', true, 'message', 'Pago rechazado');
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Acción no válida');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Vista de saldo por distribuidor
CREATE OR REPLACE VIEW distributor_balances AS
SELECT
    p.id as distributor_id,
    p.full_name,
    p.client_number,
    COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled', 'rejected') THEN o.total ELSE 0 END), 0) as total_orders,
    COALESCE(SUM(CASE WHEN dp.status = 'approved' THEN dp.amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled', 'rejected') THEN o.total ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN dp.status = 'approved' THEN dp.amount ELSE 0 END), 0) as balance
FROM profiles p
LEFT JOIN orders o ON o.distributor_id = p.id
LEFT JOIN distributor_payments dp ON dp.distributor_id = p.id
WHERE p.role = 'distributor'
GROUP BY p.id, p.full_name, p.client_number;
