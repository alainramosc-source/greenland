-- =====================================================
-- FIX: Prevent overpayment in submit_distributor_payment
-- Validates that allocation + existing pending/approved
-- amounts don't exceed order total.
-- Ejecutar en Supabase SQL Editor
-- =====================================================

CREATE OR REPLACE FUNCTION submit_distributor_payment(
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_reference TEXT DEFAULT NULL,
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_receipt_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_order_id UUID DEFAULT NULL,
    p_allocations JSONB DEFAULT NULL,
    p_payment_type TEXT DEFAULT 'order',
    p_container_amount NUMERIC DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
    v_client_number TEXT;
    v_payment_id UUID;
    v_alloc_total NUMERIC := 0;
    v_alloc JSONB;
    v_order_exists BOOLEAN;
    v_order_total NUMERIC;
    v_already_paid NUMERIC;
    v_pending_allocated NUMERIC;
    v_max_allowed NUMERIC;
    v_alloc_amount NUMERIC;
    v_alloc_order_id UUID;
    v_order_number TEXT;
BEGIN
    -- Get client number
    SELECT client_number INTO v_client_number FROM profiles WHERE id = auth.uid();

    -- Validate allocations if provided
    IF p_allocations IS NOT NULL AND jsonb_array_length(p_allocations) > 0 THEN
        -- Calculate total of allocations
        SELECT COALESCE(SUM((elem->>'amount')::NUMERIC), 0) INTO v_alloc_total
        FROM jsonb_array_elements(p_allocations) AS elem;

        -- Total allocations must not exceed payment amount
        IF v_alloc_total > p_amount + 0.01 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'La suma de asignaciones ($' || v_alloc_total || ') excede el monto del pago ($' || p_amount || ')'
            );
        END IF;

        -- Validate each allocation: order exists, belongs to user, AND won't cause overpayment
        FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
        LOOP
            -- Skip container-only allocations (no order_id)
            IF v_alloc->>'order_id' IS NULL OR v_alloc->>'order_id' = '' THEN
                CONTINUE;
            END IF;

            v_alloc_order_id := (v_alloc->>'order_id')::UUID;
            v_alloc_amount := (v_alloc->>'amount')::NUMERIC;

            -- Check order exists and belongs to distributor
            SELECT EXISTS(
                SELECT 1 FROM orders 
                WHERE id = v_alloc_order_id 
                AND distributor_id = auth.uid()
                AND status NOT IN ('cancelled', 'rejected')
            ) INTO v_order_exists;

            IF NOT v_order_exists THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Pedido no encontrado o no te pertenece: ' || v_alloc_order_id
                );
            END IF;

            -- Get order total
            SELECT total_amount, order_number INTO v_order_total, v_order_number
            FROM orders WHERE id = v_alloc_order_id;

            -- Get already approved payments for this order
            SELECT COALESCE(SUM(amount), 0) INTO v_already_paid
            FROM order_payments WHERE order_id = v_alloc_order_id;

            -- Get pending allocations from OTHER pending distributor_payments
            SELECT COALESCE(SUM((a->>'amount')::NUMERIC), 0) INTO v_pending_allocated
            FROM distributor_payments dp,
                 jsonb_array_elements(dp.allocations) AS a
            WHERE dp.distributor_id = auth.uid()
              AND dp.status = 'pending'
              AND (a->>'order_id')::UUID = v_alloc_order_id;

            -- Calculate maximum allowed
            v_max_allowed := v_order_total - v_already_paid - v_pending_allocated;

            IF v_alloc_amount > v_max_allowed + 0.01 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Sobrepago detectado en pedido #' || COALESCE(v_order_number, '') 
                        || '. Máximo aplicable: $' || GREATEST(v_max_allowed, 0)::TEXT
                        || ' (ya pagado: $' || v_already_paid::TEXT 
                        || ', pendiente de aprobación: $' || v_pending_allocated::TEXT || ')'
                );
            END IF;
        END LOOP;

        -- Use first order_id for backward compatibility
        p_order_id := (p_allocations->0->>'order_id')::UUID;
    END IF;

    INSERT INTO distributor_payments (
        distributor_id, amount, payment_method, reference, distributor_ref,
        payment_date, receipt_url, notes, order_id, allocations, status,
        payment_type, container_amount
    ) VALUES (
        auth.uid(), p_amount, p_payment_method, p_reference, v_client_number,
        p_payment_date, p_receipt_url, p_notes, p_order_id, p_allocations, 'pending',
        p_payment_type, p_container_amount
    ) RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'message', 'Pago registrado. Pendiente de aprobación.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION submit_distributor_payment TO authenticated;
