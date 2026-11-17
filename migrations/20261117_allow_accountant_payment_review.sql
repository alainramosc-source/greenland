BEGIN;

CREATE OR REPLACE FUNCTION public.approve_distributor_payment_atomic(p_payment_id uuid, p_received_by text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment RECORD;
  v_reviewer_id UUID := auth.uid();
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
  IF v_reviewer_id IS NULL OR NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'accountant']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo Super Admin o Contabilidad activos pueden aprobar pagos.');
  END IF;

  SELECT * INTO v_payment FROM public.distributor_payments
  WHERE id = p_payment_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado o ya fue revisado');
  END IF;

  IF v_payment.payment_method = 'efectivo' AND (p_received_by IS NULL OR TRIM(p_received_by) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Para pagos en efectivo, se requiere el campo "Recibido por"');
  END IF;

  IF v_payment.allocations IS NOT NULL AND jsonb_array_length(v_payment.allocations) > 0 THEN
    IF COALESCE(v_payment.container_amount, 0) > 0
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_payment.allocations) a
         WHERE a->>'order_id' IS NULL OR TRIM(a->>'order_id') = ''
       ) THEN
      v_payment.allocations := v_payment.allocations || jsonb_build_array(
        jsonb_build_object('order_id', NULL, 'amount', v_payment.container_amount)
      );
    END IF;
  ELSIF v_payment.order_id IS NOT NULL THEN
    v_payment.allocations := jsonb_build_array(
      jsonb_build_object('order_id', v_payment.order_id, 'amount', v_payment.amount)
    );
  ELSIF v_payment.payment_type = 'containers' OR v_payment.container_amount > 0 THEN
    v_payment.allocations := jsonb_build_array(
      jsonb_build_object('order_id', NULL, 'amount', v_payment.amount)
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'El pago no tiene pedidos ni contenedores asignados');
  END IF;

  FOR v_alloc IN SELECT value FROM jsonb_array_elements(v_payment.allocations)
  LOOP
    IF v_alloc->>'order_id' IS NULL OR TRIM(v_alloc->>'order_id') = '' THEN
      BEGIN
        v_alloc_amount := (v_alloc->>'amount')::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error',
          FORMAT('Monto inválido en asignación de contenedor: "%s"', COALESCE(v_alloc->>'amount', 'NULL')));
      END;

      IF v_alloc_amount IS NULL OR v_alloc_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error',
          FORMAT('Monto de contenedor inválido ($%s)', v_alloc_amount));
      END IF;

      v_total_allocated := v_total_allocated + v_alloc_amount;
      CONTINUE;
    END IF;

    BEGIN
      v_alloc_order_id := (v_alloc->>'order_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('order_id inválido: "%s". Se esperaba un UUID válido.',
          COALESCE(v_alloc->>'order_id', 'NULL')));
    END;

    BEGIN
      v_alloc_amount := (v_alloc->>'amount')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('Monto inválido: "%s" en asignación para pedido %s.',
          COALESCE(v_alloc->>'amount', 'NULL'), v_alloc_order_id));
    END;

    IF v_alloc_amount IS NULL OR v_alloc_amount <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('Monto inválido ($%s) en asignación para pedido %s',
          v_alloc_amount, v_alloc_order_id));
    END IF;

    IF v_alloc_order_id = ANY(v_seen_order_ids) THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('El pedido %s aparece más de una vez en las asignaciones.', v_alloc_order_id));
    END IF;
    v_seen_order_ids := array_append(v_seen_order_ids, v_alloc_order_id);

    v_total_allocated := v_total_allocated + v_alloc_amount;
  END LOOP;

  IF ROUND(v_total_allocated, 2) <> ROUND(v_payment.amount, 2) THEN
    RETURN jsonb_build_object('success', false, 'error',
      FORMAT('La suma de asignaciones ($%s) no coincide con el monto del pago ($%s)',
        TO_CHAR(v_total_allocated, 'FM999,999.00'),
        TO_CHAR(v_payment.amount, 'FM999,999.00')));
  END IF;

  FOR v_alloc IN
    SELECT value FROM jsonb_array_elements(v_payment.allocations)
    ORDER BY value->>'order_id'
  LOOP
    IF v_alloc->>'order_id' IS NULL OR TRIM(v_alloc->>'order_id') = '' THEN
      CONTINUE;
    END IF;

    v_alloc_order_id := (v_alloc->>'order_id')::UUID;
    v_alloc_amount := (v_alloc->>'amount')::NUMERIC;

    SELECT * INTO v_order FROM public.orders
    WHERE id = v_alloc_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('Pedido %s no existe', v_alloc_order_id));
    END IF;

    IF v_order.distributor_id IS DISTINCT FROM v_payment.distributor_id THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('El pedido %s no pertenece al distribuidor que registró el pago', v_alloc_order_id));
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_already_paid
    FROM public.order_payments WHERE order_id = v_alloc_order_id;

    v_remaining := v_order.total_amount - v_already_paid;

    IF ROUND(v_alloc_amount, 2) > ROUND(v_remaining, 2) + 0.01 THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('La asignación de $%s excede el saldo pendiente de $%s en el pedido %s',
          TO_CHAR(v_alloc_amount, 'FM999,999.00'),
          TO_CHAR(v_remaining, 'FM999,999.00'),
          v_alloc_order_id));
    END IF;
  END LOOP;

  UPDATE public.distributor_payments SET
    status = 'approved',
    reviewed_by = v_reviewer_id,
    reviewed_at = now(),
    received_by = CASE WHEN v_payment.payment_method = 'efectivo'
                  THEN TRIM(p_received_by) ELSE received_by END
  WHERE id = p_payment_id;

  FOR v_alloc IN
    SELECT value FROM jsonb_array_elements(v_payment.allocations)
    ORDER BY value->>'order_id'
  LOOP
    IF v_alloc->>'order_id' IS NULL OR TRIM(v_alloc->>'order_id') = '' THEN
      CONTINUE;
    END IF;

    v_alloc_order_id := (v_alloc->>'order_id')::UUID;
    v_alloc_amount := (v_alloc->>'amount')::NUMERIC;

    INSERT INTO public.order_payments (order_id, amount, payment_method, reference, payment_date, notes, registered_by)
    VALUES (
      v_alloc_order_id, ROUND(v_alloc_amount, 2), v_payment.payment_method,
      v_payment.reference, v_payment.payment_date,
      'Aprobado desde pagos distribuidor', v_reviewer_id
    );

    PERFORM public.update_order_payment_status(v_alloc_order_id);
  END LOOP;

  IF v_payment.payment_method = 'efectivo' THEN
    SELECT full_name INTO v_dist_name
    FROM public.profiles WHERE id = v_payment.distributor_id;

    v_dist_name := COALESCE(v_dist_name, 'Distribuidor (sin perfil)');

    INSERT INTO public.cash_movements (type, amount, concept, responsible, reference_id, reference_type, movement_date, created_by)
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
$function$
;

CREATE OR REPLACE FUNCTION public.review_distributor_payment(p_payment_id uuid, p_action text, p_rejection_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment RECORD;
BEGIN
  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'accountant']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo Super Admin o Contabilidad activos pueden revisar pagos.');
  END IF;

  IF p_action = 'approve' THEN
    RETURN public.approve_distributor_payment_atomic(p_payment_id, NULL);
  ELSIF p_action = 'reject' THEN
    SELECT * INTO v_payment
    FROM public.distributor_payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado.');
    END IF;

    IF v_payment.status != 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este pago ya fue procesado.');
    END IF;

    UPDATE public.distributor_payments
    SET status = 'rejected',
        rejection_reason = COALESCE(p_rejection_reason, 'Rechazado por administración'),
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = p_payment_id;

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Acción inválida (use approve o reject).');
  END IF;
END;
$function$
;

COMMIT;
