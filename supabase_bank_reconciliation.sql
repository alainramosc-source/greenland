-- =====================================================
-- FASE 2: Conciliación Bancaria - Schema
-- =====================================================

-- 1. Tabla de movimientos bancarios
CREATE TABLE IF NOT EXISTS bank_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_name TEXT NOT NULL DEFAULT 'banorte',
    account_number TEXT,
    operation_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    reference_extracted TEXT, -- DIST-XXX extraído del campo descripción
    raw_data JSONB, -- fila completa del Excel como respaldo
    match_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('matched', 'unmatched', 'manual', 'ignored')),
    matched_payment_id UUID REFERENCES distributor_payments(id),
    batch_id TEXT, -- para agrupar movimientos del mismo upload
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    uploaded_by UUID REFERENCES auth.users(id)
);

-- 2. Agregar referencia inversa en distributor_payments
ALTER TABLE distributor_payments 
ADD COLUMN IF NOT EXISTS bank_movement_id UUID REFERENCES bank_movements(id);

-- 3. RLS para bank_movements (solo admins)
ALTER TABLE bank_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to bank_movements"
ON bank_movements FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Grants
GRANT ALL ON bank_movements TO authenticated;

-- 5. RPC para auto-aprobar matches en lote
CREATE OR REPLACE FUNCTION approve_matched_payments(p_batch_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_count INT := 0;
    v_movement RECORD;
    v_payment RECORD;
    v_total_paid NUMERIC;
    v_order_total NUMERIC;
BEGIN
    -- Verify admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    -- Process each matched movement in this batch
    FOR v_movement IN 
        SELECT bm.id as movement_id, bm.matched_payment_id
        FROM bank_movements bm
        WHERE bm.batch_id = p_batch_id 
        AND bm.match_status = 'matched'
        AND bm.matched_payment_id IS NOT NULL
    LOOP
        -- Get the payment
        SELECT * INTO v_payment FROM distributor_payments WHERE id = v_movement.matched_payment_id AND status = 'pending';
        IF FOUND THEN
            -- Approve the payment
            UPDATE distributor_payments SET 
                status = 'approved', 
                reviewed_by = auth.uid(), 
                reviewed_at = now(),
                bank_movement_id = v_movement.movement_id
            WHERE id = v_movement.matched_payment_id;

            -- Link movement to payment
            UPDATE bank_movements SET match_status = 'matched' WHERE id = v_movement.movement_id;

            -- If linked to an order, sync to order_payments
            IF v_payment.order_id IS NOT NULL THEN
                INSERT INTO order_payments (order_id, amount, payment_method, reference, payment_date, notes)
                VALUES (v_payment.order_id, v_payment.amount, v_payment.payment_method,
                        v_payment.reference, v_payment.payment_date, 'Auto-aprobado por conciliación bancaria');

                -- Update order payment_status
                SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
                FROM order_payments WHERE order_id = v_payment.order_id;

                SELECT total_amount INTO v_order_total FROM orders WHERE id = v_payment.order_id;

                UPDATE orders SET payment_status = 
                    CASE 
                        WHEN v_total_paid >= v_order_total THEN 'paid'
                        WHEN v_total_paid > 0 THEN 'partial'
                        ELSE 'unpaid'
                    END
                WHERE id = v_payment.order_id;
            END IF;

            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'approved_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION approve_matched_payments TO authenticated;
