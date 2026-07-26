-- ============================================================
-- RPC: approve_distributor_payment_atomic
-- 
-- Replaces the client-side handleApprove with an atomic 
-- server-side function. All steps succeed or none do.
--
-- Covers: payment approval, order_payments allocation with
-- overpayment prevention, payment_status update, cash_movements
-- for cash payments, and received_by tracking.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_distributor_payment_atomic(
    p_payment_id UUID,
    p_received_by TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
    v_reviewer_id UUID;
    v_alloc JSONB;
    v_alloc_order_id UUID;
    v_alloc_amount NUMERIC;
    v_order RECORD;
    v_already_paid NUMERIC;
    v_remaining NUMERIC;
    v_total_allocated NUMERIC := 0;
    v_dist_name TEXT;
    v_seen_order_ids UUID[] := '{}';
BEGIN
    -- ============================================
    -- PHASE 0: AUTH + PAYMENT LOCK
    -- ============================================

    v_reviewer_id := auth.uid();
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_reviewer_id AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    SELECT * INTO v_payment FROM distributor_payments
    WHERE id = p_payment_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado o ya fue revisado');
    END IF;

    IF v_payment.payment_method = 'efectivo' AND (p_received_by IS NULL OR TRIM(p_received_by) = '') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Para pagos en efectivo, se requiere el campo "Recibido por"');
    END IF;

    -- Build allocations (normalize legacy single-order to array)
    IF v_payment.allocations IS NOT NULL AND jsonb_array_length(v_payment.allocations) > 0 THEN
        NULL;
    ELSIF v_payment.order_id IS NOT NULL THEN
        v_payment.allocations := jsonb_build_array(
            jsonb_build_object('order_id', v_payment.order_id, 'amount', v_payment.amount)
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'El pago no tiene pedidos asignados');
    END IF;

    -- ============================================
    -- PHASE 1: FORMAT + DUPLICATES PRE-VALIDATION
    -- ============================================

    FOR v_alloc IN SELECT value FROM jsonb_array_elements(v_payment.allocations)
    LOOP
        -- Validate UUID format
        BEGIN
            v_alloc_order_id := (v_alloc->>'order_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', false, 'error',
                FORMAT('order_id inválido: "%s". Se esperaba un UUID válido.',
                    COALESCE(v_alloc->>'order_id', 'NULL')));
        END;

        -- Validate NUMERIC format
        BEGIN
            v_alloc_amount := (v_alloc->>'amount')::NUMERIC;
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', false, 'error',
                FORMAT('Monto inválido: "%s" en asignación para pedido %s. Se esperaba un valor numérico.',
                    COALESCE(v_alloc->>'amount', 'NULL'), v_alloc_order_id));
        END;

        IF v_alloc_amount IS NULL OR v_alloc_amount <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error',
                FORMAT('Monto inválido ($%s) en asignación para pedido %s',
                    v_alloc_amount, v_alloc_order_id));
        END IF;

        -- Check duplicate order_id
        IF v_alloc_order_id = ANY(v_seen_order_ids) THEN
            RETURN jsonb_build_object('success', false, 'error',
                FORMAT('El pedido %s aparece más de una vez en las asignaciones. Consolida los montos en una sola asignación.',
                    v_alloc_order_id));
        END IF;
        v_seen_order_ids := array_append(v_seen_order_ids, v_alloc_order_id);

        v_total_allocated := v_total_allocated + v_alloc_amount;
    END LOOP;

    -- Verify total allocated matches payment amount
    IF v_total_allocated <> v_payment.amount THEN
        RETURN jsonb_build_object('success', false, 'error',
            FORMAT('La suma de asignaciones ($%s) no coincide con el monto del pago ($%s)',
                TO_CHAR(v_total_allocated, 'FM999,999.00'),
                TO_CHAR(v_payment.amount, 'FM999,999.00')));
    END IF;

    -- ============================================
    -- PHASE 2: BUSINESS VALIDATION
    -- Deterministic order (by order_id) to prevent deadlocks
    -- ============================================

    FOR v_alloc IN
        SELECT value FROM jsonb_array_elements(v_payment.allocations)
        ORDER BY value->>'order_id'
    LOOP
        v_alloc_order_id := (v_alloc->>'order_id')::UUID;
        v_alloc_amount := (v_alloc->>'amount')::NUMERIC;

        -- Lock order row (deterministic order prevents deadlocks)
        SELECT * INTO v_order FROM orders
        WHERE id = v_alloc_order_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error',
                FORMAT('Pedido %s no existe', v_alloc_order_id));
        END IF;

        -- Verify order belongs to the same distributor
        IF v_order.distributor_id IS DISTINCT FROM v_payment.distributor_id THEN
            RETURN jsonb_build_object('success', false, 'error',
                FORMAT('El pedido %s no pertenece al distribuidor que registró el pago', v_alloc_order_id));
        END IF;

        -- Check remaining balance
        SELECT COALESCE(SUM(amount), 0) INTO v_already_paid
        FROM order_payments WHERE order_id = v_alloc_order_id;

        v_remaining := v_order.total_amount - v_already_paid;

        IF v_alloc_amount > v_remaining THEN
            RETURN jsonb_build_object('success', false, 'error',
                FORMAT('La asignación de $%s excede el saldo pendiente de $%s en el pedido %s',
                    TO_CHAR(v_alloc_amount, 'FM999,999.00'),
                    TO_CHAR(v_remaining, 'FM999,999.00'),
                    v_alloc_order_id));
        END IF;
    END LOOP;

    -- ============================================
    -- PHASE 3: EXECUTION (all validations passed)
    -- Same deterministic order
    -- ============================================

    -- Mark payment as approved
    UPDATE distributor_payments SET
        status = 'approved',
        reviewed_by = v_reviewer_id,
        reviewed_at = now(),
        received_by = CASE WHEN v_payment.payment_method = 'efectivo'
                      THEN TRIM(p_received_by) ELSE received_by END
    WHERE id = p_payment_id;

    -- Apply allocations to orders
    FOR v_alloc IN
        SELECT value FROM jsonb_array_elements(v_payment.allocations)
        ORDER BY value->>'order_id'
    LOOP
        v_alloc_order_id := (v_alloc->>'order_id')::UUID;
        v_alloc_amount := (v_alloc->>'amount')::NUMERIC;

        INSERT INTO order_payments (order_id, amount, payment_method, reference, payment_date, notes)
        VALUES (
            v_alloc_order_id, v_alloc_amount, v_payment.payment_method,
            v_payment.reference, v_payment.payment_date,
            'Aprobado desde pagos distribuidor'
        );

        PERFORM update_order_payment_status(v_alloc_order_id);
    END LOOP;

    -- Insert cash movement if payment is cash
    IF v_payment.payment_method = 'efectivo' THEN
        SELECT full_name INTO v_dist_name
        FROM profiles WHERE id = v_payment.distributor_id;

        v_dist_name := COALESCE(v_dist_name, 'Distribuidor (sin perfil)');

        INSERT INTO cash_movements (type, amount, concept, responsible, reference_id, reference_type, movement_date, created_by)
        VALUES (
            'entry', v_payment.amount,
            'Pago distribuidor: ' || v_dist_name,
            TRIM(p_received_by),
            p_payment_id, 'distributor_payment',
            COALESCE(v_payment.payment_date, CURRENT_DATE),
            v_reviewer_id
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Pago aprobado correctamente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
