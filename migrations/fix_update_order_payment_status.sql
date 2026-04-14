-- =====================================================
-- FIX v3: Dos cambios para resolver el error
-- 1. Crear update_order_payment_status con schema explícito
-- 2. Recrear review_distributor_payment con SET search_path
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Paso 1: Crear la función faltante en schema public
CREATE OR REPLACE FUNCTION public.update_order_payment_status(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    v_order RECORD;
    v_total_paid NUMERIC;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN RETURN; END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
    FROM public.order_payments WHERE order_id = p_order_id;

    IF v_total_paid >= v_order.total_amount THEN
        UPDATE public.orders SET payment_status = 'paid' WHERE id = p_order_id;
    ELSIF v_total_paid > 0 THEN
        UPDATE public.orders SET payment_status = 'partial' WHERE id = p_order_id;
    ELSE
        UPDATE public.orders SET payment_status = 'unpaid' WHERE id = p_order_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Paso 2: Recrear review_distributor_payment con search_path = public
CREATE OR REPLACE FUNCTION public.review_distributor_payment(
    p_payment_id UUID,
    p_action TEXT,
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
