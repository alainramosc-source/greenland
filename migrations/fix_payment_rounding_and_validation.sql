-- =====================================================================
-- FIX INTEGRAL: Redondeo a 2 decimales y validación estricta en Pagos
-- ---------------------------------------------------------------------
-- 1. Limpia los pagos pendientes actuales (ej. Leticia Martínez $113,400.00)
--    redondeando sus allocations a 2 decimales para eliminar basura IEEE-754
--    (ej. 4184.809999999998 -> 4184.81).
-- 2. En submit_distributor_payment (cuando el distribuidor sube el pago):
--    - Redondea todos los montos a 2 decimales antes de guardar.
--    - Rechaza el registro SI la suma de asignaciones (pedidos + contenedores)
--      NO coincide exactamente con el monto del pago (ya sea mayor O menor).
-- 3. En approve_distributor_payment_atomic (cuando el admin aprueba):
--    - Redondea asignaciones a 2 decimales y compara con tolerancia de $0.01.
-- 4. En update_order_payment_status:
--    - Marca el pedido como 'paid' con tolerancia de $0.01.
-- =====================================================================

-- PASO 1: Limpiar decimales fantasma en pagos pendientes actuales
UPDATE public.distributor_payments dp
SET
    amount = ROUND(dp.amount, 2),
    container_amount = ROUND(COALESCE(dp.container_amount, 0), 2),
    allocations = (
        SELECT jsonb_agg(
            CASE
                WHEN elem->>'order_id' IS NULL OR TRIM(elem->>'order_id') = '' THEN
                    jsonb_build_object('order_id', NULL, 'amount', ROUND((elem->>'amount')::NUMERIC, 2))
                ELSE
                    jsonb_build_object('order_id', elem->>'order_id', 'amount', ROUND((elem->>'amount')::NUMERIC, 2))
            END
        )
        FROM jsonb_array_elements(dp.allocations) AS elem
    )
WHERE dp.status = 'pending'
  AND dp.allocations IS NOT NULL
  AND jsonb_array_length(dp.allocations) > 0;


-- PASO 2: Bloquear inconsistencias desde que el DISTRIBUIDOR sube el pago
CREATE OR REPLACE FUNCTION public.submit_distributor_payment(
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
    v_clean_amount NUMERIC;
    v_clean_container NUMERIC;
    v_clean_allocs JSONB := '[]'::JSONB;
    v_alloc_orders_total NUMERIC := 0;
    v_alloc_null_total NUMERIC := 0;
    v_expected_total NUMERIC := 0;
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
    v_clean_amount := ROUND(COALESCE(p_amount, 0), 2);
    v_clean_container := ROUND(COALESCE(p_container_amount, 0), 2);

    IF v_clean_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'El monto del pago debe ser mayor a $0.00');
    END IF;

    SELECT client_number INTO v_client_number FROM profiles WHERE id = auth.uid();

    IF p_allocations IS NULL OR jsonb_array_length(p_allocations) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Debes seleccionar al menos un pedido o saldo de contenedores para aplicar el pago.'
        );
    END IF;

    -- Normalizar y redondear cada asignación a 2 decimales
    FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_alloc_amount := ROUND(COALESCE((v_alloc->>'amount')::NUMERIC, 0), 2);
        IF v_alloc_amount <= 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Todas las asignaciones deben tener un monto mayor a $0.00'
            );
        END IF;

        IF v_alloc->>'order_id' IS NULL OR TRIM(v_alloc->>'order_id') = '' THEN
            v_alloc_null_total := v_alloc_null_total + v_alloc_amount;
            v_clean_allocs := v_clean_allocs || jsonb_build_array(
                jsonb_build_object('order_id', NULL, 'amount', v_alloc_amount)
            );
            CONTINUE;
        END IF;

        v_alloc_order_id := (v_alloc->>'order_id')::UUID;
        v_alloc_orders_total := v_alloc_orders_total + v_alloc_amount;
        v_clean_allocs := v_clean_allocs || jsonb_build_array(
            jsonb_build_object('order_id', v_alloc_order_id::TEXT, 'amount', v_alloc_amount)
        );

        -- Verificar que el pedido exista y pertenezca al distribuidor
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

        SELECT ROUND(total_amount, 2), order_number INTO v_order_total, v_order_number
        FROM orders WHERE id = v_alloc_order_id;

        SELECT ROUND(COALESCE(SUM(amount), 0), 2) INTO v_already_paid
        FROM order_payments WHERE order_id = v_alloc_order_id;

        SELECT ROUND(COALESCE(SUM((a->>'amount')::NUMERIC), 0), 2) INTO v_pending_allocated
        FROM distributor_payments dp,
             jsonb_array_elements(dp.allocations) AS a
        WHERE dp.distributor_id = auth.uid()
          AND dp.status = 'pending'
          AND a->>'order_id' IS NOT NULL
          AND TRIM(a->>'order_id') <> ''
          AND (a->>'order_id')::UUID = v_alloc_order_id;

        v_max_allowed := ROUND(v_order_total - v_already_paid - v_pending_allocated, 2);

        IF v_alloc_amount > v_max_allowed + 0.01 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Sobrepago detectado en pedido #' || COALESCE(v_order_number, '')
                    || '. Máximo aplicable: $' || TO_CHAR(GREATEST(v_max_allowed, 0), 'FM999,999,990.00')
                    || ' (ya pagado: $' || TO_CHAR(v_already_paid, 'FM999,999,990.00')
                    || ', en revisión: $' || TO_CHAR(v_pending_allocated, 'FM999,999,990.00') || ')'
            );
        END IF;
    END LOOP;

    -- Calcular suma total asignada (pedidos + contenedores)
    IF v_alloc_null_total > 0 THEN
        v_expected_total := ROUND(v_alloc_orders_total + v_alloc_null_total, 2);
    ELSE
        v_expected_total := ROUND(v_alloc_orders_total + v_clean_container, 2);
    END IF;

    -- VALIDACIÓN ESTRICTA: La suma asignada debe ser EXACTAMENTE igual al monto del pago
    IF ABS(v_expected_total - v_clean_amount) > 0.01 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', FORMAT(
                'La suma de tus asignaciones ($%s) debe coincidir exactamente con el monto total del pago ($%s). Corrige los montos antes de enviar.',
                TO_CHAR(v_expected_total, 'FM999,999,990.00'),
                TO_CHAR(v_clean_amount, 'FM999,999,990.00')
            )
        );
    END IF;

    -- Primer order_id para compatibilidad
    IF (v_clean_allocs->0->>'order_id') IS NOT NULL AND TRIM(v_clean_allocs->0->>'order_id') <> '' THEN
        p_order_id := (v_clean_allocs->0->>'order_id')::UUID;
    ELSE
        p_order_id := NULL;
    END IF;

    INSERT INTO distributor_payments (
        distributor_id, amount, payment_method, reference, distributor_ref,
        payment_date, receipt_url, notes, order_id, allocations, status,
        payment_type, container_amount
    ) VALUES (
        auth.uid(), v_clean_amount, p_payment_method, p_reference, v_client_number,
        p_payment_date, p_receipt_url, p_notes, p_order_id, v_clean_allocs, 'pending',
        p_payment_type, v_clean_container
    ) RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'message', 'Pago registrado. Pendiente de aprobación.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.submit_distributor_payment TO authenticated;


-- PASO 3: Actualizar approve_distributor_payment_atomic con redondeo a 2 decimales
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

    v_payment.amount := ROUND(v_payment.amount, 2);

    -- Normalizar asignaciones (Pedidos u Ordenes de Contenedores)
    IF v_payment.allocations IS NOT NULL AND jsonb_array_length(v_payment.allocations) > 0 THEN
        IF COALESCE(v_payment.container_amount, 0) > 0
           AND NOT EXISTS (
               SELECT 1 FROM jsonb_array_elements(v_payment.allocations) a
               WHERE a->>'order_id' IS NULL OR TRIM(a->>'order_id') = ''
           ) THEN
            v_payment.allocations := v_payment.allocations || jsonb_build_array(
                jsonb_build_object('order_id', NULL, 'amount', ROUND(v_payment.container_amount, 2))
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

    -- FASE 1: VALIDACIÓN DE MONTOS Y FORMATO (REDONDEADO A 2 DECIMALES)
    FOR v_alloc IN SELECT value FROM jsonb_array_elements(v_payment.allocations)
    LOOP
        IF v_alloc->>'order_id' IS NULL OR TRIM(v_alloc->>'order_id') = '' THEN
            BEGIN
                v_alloc_amount := ROUND((v_alloc->>'amount')::NUMERIC, 2);
            EXCEPTION WHEN OTHERS THEN
                RETURN jsonb_build_object('success', false, 'error',
                    FORMAT('Monto inválido en asignación de contenedor: "%s"', COALESCE(v_alloc->>'amount', 'NULL')));
            END;

            IF v_alloc_amount IS NULL OR v_alloc_amount <= 0 THEN
                RETURN jsonb_build_object('success', false, 'error',
                    FORMAT('Monto de contenedor inválido ($%s)', v_alloc_amount));
            END IF;

            v_total_allocated := ROUND(v_total_allocated + v_alloc_amount, 2);
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
            v_alloc_amount := ROUND((v_alloc->>'amount')::NUMERIC, 2);
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

        v_total_allocated := ROUND(v_total_allocated + v_alloc_amount, 2);
    END LOOP;

    -- Verificar coincidencia total de montos con tolerancia de 1 centavo
    IF ABS(ROUND(v_total_allocated, 2) - ROUND(v_payment.amount, 2)) > 0.01 THEN
        RETURN jsonb_build_object('success', false, 'error',
            FORMAT('La suma de asignaciones ($%s) no coincide con el monto del pago ($%s)',
                TO_CHAR(ROUND(v_total_allocated, 2), 'FM999,999,990.00'),
                TO_CHAR(ROUND(v_payment.amount, 2), 'FM999,999,990.00')));
    END IF;

    -- FASE 2: VALIDACIÓN DE NEGOCIO EN TABLA ORDERS
    FOR v_alloc IN
        SELECT value FROM jsonb_array_elements(v_payment.allocations)
        ORDER BY value->>'order_id'
    LOOP
        IF v_alloc->>'order_id' IS NULL OR TRIM(v_alloc->>'order_id') = '' THEN
            CONTINUE;
        END IF;

        v_alloc_order_id := (v_alloc->>'order_id')::UUID;
        v_alloc_amount := ROUND((v_alloc->>'amount')::NUMERIC, 2);

        SELECT * INTO v_order FROM orders
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

        SELECT ROUND(COALESCE(SUM(amount), 0), 2) INTO v_already_paid
        FROM order_payments WHERE order_id = v_alloc_order_id;

        v_remaining := ROUND(v_order.total_amount - v_already_paid, 2);

        IF v_alloc_amount > v_remaining + 0.01 THEN
            RETURN jsonb_build_object('success', false, 'error',
                FORMAT('La asignación de $%s excede el saldo pendiente de $%s en el pedido #%s',
                    TO_CHAR(v_alloc_amount, 'FM999,999,990.00'),
                    TO_CHAR(v_remaining, 'FM999,999,990.00'),
                    COALESCE(v_order.order_number, v_alloc_order_id::TEXT)));
        END IF;
    END LOOP;

    -- FASE 3: EJECUCIÓN (APROBACIÓN DE PAGO)
    UPDATE distributor_payments SET
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
        v_alloc_amount := ROUND((v_alloc->>'amount')::NUMERIC, 2);

        INSERT INTO order_payments (order_id, amount, payment_method, reference, payment_date, notes)
        VALUES (
            v_alloc_order_id, v_alloc_amount, v_payment.payment_method,
            v_payment.reference, v_payment.payment_date,
            'Aprobado desde pagos distribuidor'
        );

        PERFORM update_order_payment_status(v_alloc_order_id);
    END LOOP;

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


-- PASO 4: Actualizar update_order_payment_status con tolerancia de $0.01
CREATE OR REPLACE FUNCTION public.update_order_payment_status(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    v_order RECORD;
    v_total_paid NUMERIC;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN RETURN; END IF;

    SELECT ROUND(COALESCE(SUM(amount), 0), 2) INTO v_total_paid
    FROM public.order_payments WHERE order_id = p_order_id;

    IF v_total_paid >= ROUND(v_order.total_amount, 2) - 0.01 THEN
        UPDATE public.orders SET payment_status = 'paid' WHERE id = p_order_id;
    ELSIF v_total_paid > 0 THEN
        UPDATE public.orders SET payment_status = 'partial' WHERE id = p_order_id;
    ELSE
        UPDATE public.orders SET payment_status = 'unpaid' WHERE id = p_order_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
