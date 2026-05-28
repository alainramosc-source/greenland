-- =====================================================
-- PAGOS MULTI-PEDIDO — Migration
-- Agrega allocations JSONB y actualiza RPCs
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar columna allocations a distributor_payments
ALTER TABLE distributor_payments 
ADD COLUMN IF NOT EXISTS allocations JSONB DEFAULT NULL;

-- Comentario: allocations almacena un array de objetos:
-- [{"order_id": "uuid-xxx", "amount": 30000}, {"order_id": "uuid-yyy", "amount": 20000}]
-- Si es NULL, el pago usa el order_id legacy (backward compatible)

-- 2. Migrar datos existentes: convertir order_id a allocations para registros existentes
UPDATE distributor_payments
SET allocations = jsonb_build_array(
  jsonb_build_object('order_id', order_id::text, 'amount', amount)
)
WHERE order_id IS NOT NULL AND allocations IS NULL;

-- 3. Nuevo RPC: submit_distributor_payment (actualizado para soportar allocations)
CREATE OR REPLACE FUNCTION submit_distributor_payment(
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_reference TEXT DEFAULT NULL,
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_receipt_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_order_id UUID DEFAULT NULL,
    p_allocations JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_client_number TEXT;
    v_payment_id UUID;
    v_alloc_total NUMERIC := 0;
    v_alloc JSONB;
    v_order_exists BOOLEAN;
BEGIN
    -- Get client number
    SELECT client_number INTO v_client_number FROM profiles WHERE id = auth.uid();

    -- Validate allocations if provided
    IF p_allocations IS NOT NULL AND jsonb_array_length(p_allocations) > 0 THEN
        -- Calculate total of allocations
        SELECT COALESCE(SUM((elem->>'amount')::NUMERIC), 0) INTO v_alloc_total
        FROM jsonb_array_elements(p_allocations) AS elem;

        -- Total allocations must not exceed payment amount
        IF v_alloc_total > p_amount THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'La suma de asignaciones ($' || v_alloc_total || ') excede el monto del pago ($' || p_amount || ')'
            );
        END IF;

        -- Validate each order exists and belongs to this distributor (skip container allocations where order_id is null)
        FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
        LOOP
            -- Skip container-only allocations (no order_id)
            IF v_alloc->>'order_id' IS NULL OR v_alloc->>'order_id' = '' THEN
                CONTINUE;
            END IF;

            SELECT EXISTS(
                SELECT 1 FROM orders 
                WHERE id = (v_alloc->>'order_id')::UUID 
                AND distributor_id = auth.uid()
                AND status NOT IN ('cancelled', 'rejected')
            ) INTO v_order_exists;

            IF NOT v_order_exists THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Pedido no encontrado o no te pertenece: ' || (v_alloc->>'order_id')
                );
            END IF;
        END LOOP;

        -- Use first order_id for backward compatibility
        p_order_id := (p_allocations->0->>'order_id')::UUID;
    END IF;

    INSERT INTO distributor_payments (
        distributor_id, amount, payment_method, reference, distributor_ref,
        payment_date, receipt_url, notes, order_id, allocations, status
    ) VALUES (
        auth.uid(), p_amount, p_payment_method, p_reference, v_client_number,
        p_payment_date, p_receipt_url, p_notes, p_order_id, p_allocations, 'pending'
    ) RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'message', 'Pago registrado. Pendiente de aprobación.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Actualizar RPC de revisión para soportar allocations
CREATE OR REPLACE FUNCTION review_distributor_payment(
    p_payment_id UUID,
    p_action TEXT,  -- 'approve' or 'reject'
    p_rejection_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_payment RECORD;
    v_alloc JSONB;
    v_alloc_order_id UUID;
    v_alloc_amount NUMERIC;
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

        -- Apply allocations to respective orders
        IF v_payment.allocations IS NOT NULL AND jsonb_array_length(v_payment.allocations) > 0 THEN
            FOR v_alloc IN SELECT * FROM jsonb_array_elements(v_payment.allocations)
            LOOP
                v_alloc_order_id := (v_alloc->>'order_id')::UUID;
                v_alloc_amount := (v_alloc->>'amount')::NUMERIC;

                INSERT INTO order_payments (order_id, amount, payment_method, reference, payment_date, notes)
                VALUES (v_alloc_order_id, v_alloc_amount, v_payment.payment_method,
                        v_payment.reference, v_payment.payment_date, 
                        'Aprobado desde pagos distribuidor (multi-pedido)');

                PERFORM update_order_payment_status(v_alloc_order_id);
            END LOOP;
        ELSIF v_payment.order_id IS NOT NULL THEN
            -- Legacy: single order_id
            INSERT INTO order_payments (order_id, amount, payment_method, reference, payment_date, notes)
            VALUES (v_payment.order_id, v_payment.amount, v_payment.payment_method,
                    v_payment.reference, v_payment.payment_date, 'Aprobado desde pagos distribuidor');

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
