-- ============================================================================
-- PARCHE DE REGRESIÓN POST-EXPAND: BODEGA POR PARTIDA (order_items.warehouse_id)
-- ============================================================================
-- Contexto:
--   En producción, public.orders NO tiene columna warehouse_id; la bodega se
--   asigna por partida en public.order_items.warehouse_id.
--   Este parche actualiza exclusivamente:
--     1. public.confirm_order(UUID)
--     2. public.cancel_order(UUID, TEXT)
--     3. public.update_order_status(UUID, TEXT, TEXT)
--     4. public.update_order_item_quantity(UUID, UUID, INTEGER)
--   para usar únicamente order_items.warehouse_id, validar que exista bodega
--   asignada antes de mover/reservar/liberar inventario y conservar todos los
--   controles de autorización y permisos de ejecución.
-- ============================================================================

BEGIN;

-- 1. confirm_order: usa la bodega de cada partida (order_items.warehouse_id);
--    valida que todas las partidas tengan bodega asignada y stock disponible
--    ANTES de reservar o mover inventario.
CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_missing_item RECORD;
  v_item RECORD;
  v_wh_stock RECORD;
  v_has_sync_trigger BOOLEAN;
  v_is_authorized_pro BOOLEAN := FALSE;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p_pro
      JOIN public.profiles p_sub ON p_sub.parent_distributor_id = p_pro.id
      WHERE p_pro.id = v_caller_id
        AND p_pro.role = 'distributor'
        AND p_pro.sub_role = 'distributor_pro'
        AND COALESCE(p_pro.is_active, true) = true
        AND p_sub.id = v_order.distributor_id
    ) INTO v_is_authorized_pro;

    IF NOT v_is_authorized_pro THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para confirmar pedidos.');
    END IF;
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden confirmar pedidos en estado Pendiente');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = p_order_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'El pedido no contiene partidas para confirmar.');
  END IF;

  -- Validar que todas las partidas tengan bodega asignada ANTES de tocar inventario
  SELECT oi.id, p.sku, p.name AS product_name
  INTO v_missing_item
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = p_order_id
    AND oi.warehouse_id IS NULL
  ORDER BY oi.id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format(
        'La partida %s (%s) no tiene bodega asignada. Asigna una bodega a todas las partidas antes de confirmar el pedido.',
        v_missing_item.sku, v_missing_item.product_name
      )
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_product_stock'
      AND NOT tgisinternal
  ) INTO v_has_sync_trigger;

  -- 1. Validar disponibilidad por (bodega, producto) con bloqueo FOR UPDATE antes de reservar
  FOR v_item IN
    SELECT
      oi.warehouse_id,
      oi.product_id,
      SUM(oi.quantity)::INT AS required_qty,
      p.name AS product_name,
      p.sku
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    GROUP BY oi.warehouse_id, oi.product_id, p.name, p.sku
    ORDER BY oi.product_id, oi.warehouse_id
  LOOP
    SELECT stock_quantity, reserved_quantity
    INTO v_wh_stock
    FROM public.warehouse_stock
    WHERE warehouse_id = v_item.warehouse_id AND product_id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND OR (COALESCE(v_wh_stock.stock_quantity, 0) - COALESCE(v_wh_stock.reserved_quantity, 0)) < v_item.required_qty THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format(
          'Stock disponible insuficiente en bodega para %s (%s). Disponible: %s, solicitado: %s.',
          v_item.sku, v_item.product_name,
          GREATEST(0, COALESCE(v_wh_stock.stock_quantity, 0) - COALESCE(v_wh_stock.reserved_quantity, 0)),
          v_item.required_qty
        )
      );
    END IF;
  END LOOP;

  -- Recalcular total basado en partidas actuales
  UPDATE public.orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM public.order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  -- 2. Reservar inventario en la bodega de cada partida sin doble conteo
  FOR v_item IN
    SELECT * FROM public.order_items WHERE order_id = p_order_id ORDER BY id
  LOOP
    UPDATE public.warehouse_stock
    SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_item.quantity,
        updated_at = now()
    WHERE warehouse_id = v_item.warehouse_id AND product_id = v_item.product_id;

    IF NOT v_has_sync_trigger THEN
      UPDATE public.products
      SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_item.quantity
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE public.orders
  SET status = 'confirmed',
      confirmed_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_order(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.confirm_order(UUID) TO authenticated;

-- 2. cancel_order: usa la bodega de cada partida (order_items.warehouse_id);
--    cuando el pedido está confirmado o en surtido, verifica que todas las partidas
--    tengan bodega asignada ANTES de liberar inventario reservado.
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Cancelado por administrador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_missing_item RECORD;
  v_item RECORD;
  v_is_admin BOOLEAN;
  v_has_sync_trigger BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  v_is_admin := public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']);

  IF NOT v_is_admin THEN
    IF v_order.distributor_id IS DISTINCT FROM v_caller_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para cancelar este pedido.');
    END IF;
    IF v_order.status != 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Solo puedes cancelar pedidos que aún estén en estado Pendiente.');
    END IF;
  END IF;

  IF v_order.status NOT IN ('pending', 'confirmed', 'in_fulfillment') THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Solo se pueden cancelar pedidos en estado Pendiente, Confirmado o En Surtido.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_product_stock'
      AND NOT tgisinternal
  ) INTO v_has_sync_trigger;

  IF v_order.status IN ('confirmed', 'in_fulfillment') THEN
    -- Validar que todas las partidas tengan bodega asignada antes de liberar reserva
    SELECT oi.id, p.sku, p.name AS product_name
    INTO v_missing_item
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND oi.warehouse_id IS NULL
    ORDER BY oi.id
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format(
          'La partida %s (%s) no tiene bodega asignada. Asigna su bodega antes de cancelar para liberar el inventario reservado.',
          v_missing_item.sku, v_missing_item.product_name
        )
      );
    END IF;

    FOR v_item IN
      SELECT * FROM public.order_items WHERE order_id = p_order_id ORDER BY id
    LOOP
      UPDATE public.warehouse_stock
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
          updated_at = now()
      WHERE warehouse_id = v_item.warehouse_id
        AND product_id = v_item.product_id;

      IF NOT v_has_sync_trigger THEN
        UPDATE public.products
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      rejection_reason = p_reason,
      notes = COALESCE(notes, '') || E'\n\n❌ CANCELADO: ' || p_reason || ' — ' || to_char(now(), 'DD/Mon/YYYY HH24:MI')
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'message', 'Pedido cancelado. Inventario liberado. Los pagos registrados se mantienen.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) TO authenticated;

-- 3. update_order_status: usa la bodega de cada partida (order_items.warehouse_id);
--    valida que todas las partidas tengan bodega asignada ANTES de pasar a surtido,
--    descontar stock por envío (shipped) o liberar reserva por cancelación/rechazo.
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_missing_item RECORD;
  v_item RECORD;
  v_wh_stock RECORD;
  v_has_sync_trigger BOOLEAN;
  v_is_authorized_pro BOOLEAN := FALSE;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p_pro
      JOIN public.profiles p_sub ON p_sub.parent_distributor_id = p_pro.id
      WHERE p_pro.id = v_caller_id
        AND p_pro.role = 'distributor'
        AND p_pro.sub_role = 'distributor_pro'
        AND COALESCE(p_pro.is_active, true) = true
        AND p_sub.id = v_order.distributor_id
    ) INTO v_is_authorized_pro;

    IF NOT v_is_authorized_pro THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para actualizar el estado operativo del pedido.');
    END IF;
  END IF;

  IF p_new_status = 'confirmed' AND v_order.status = 'pending' THEN
    RETURN public.confirm_order(p_order_id);
  END IF;

  IF p_new_status = 'in_fulfillment' AND v_order.status != 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo pedidos confirmados pueden pasar a surtido');
  END IF;

  IF p_new_status = 'shipped' AND v_order.status != 'in_fulfillment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo pedidos en surtido pueden marcarse como enviados');
  END IF;

  IF p_new_status = 'closed' AND v_order.status != 'shipped' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo pedidos enviados pueden cerrarse');
  END IF;

  -- Validar que todas las partidas tengan bodega asignada cuando sea necesaria ANTES de mover inventario
  IF p_new_status = 'in_fulfillment'
     OR (p_new_status = 'shipped' AND v_order.status = 'in_fulfillment')
     OR (p_new_status IN ('cancelled', 'rejected') AND v_order.status IN ('confirmed', 'in_fulfillment'))
  THEN
    SELECT oi.id, p.sku, p.name AS product_name
    INTO v_missing_item
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND oi.warehouse_id IS NULL
    ORDER BY oi.id
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format(
          'La partida %s (%s) no tiene bodega asignada. Asigna una bodega a todas las partidas antes de continuar.',
          v_missing_item.sku, v_missing_item.product_name
        )
      );
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_product_stock'
      AND NOT tgisinternal
  ) INTO v_has_sync_trigger;

  -- SHIPPED: validar existencias con bloqueo FOR UPDATE, luego liberar reserva y descontar stock sin doble conteo
  IF p_new_status = 'shipped' AND v_order.status = 'in_fulfillment' THEN
    FOR v_item IN
      SELECT
        oi.warehouse_id,
        oi.product_id,
        SUM(oi.quantity)::INT AS required_qty,
        p.name AS product_name,
        p.sku
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = p_order_id
      GROUP BY oi.warehouse_id, oi.product_id, p.name, p.sku
      ORDER BY oi.product_id, oi.warehouse_id
    LOOP
      SELECT stock_quantity, reserved_quantity
      INTO v_wh_stock
      FROM public.warehouse_stock
      WHERE warehouse_id = v_item.warehouse_id AND product_id = v_item.product_id
      FOR UPDATE;

      IF NOT FOUND OR COALESCE(v_wh_stock.stock_quantity, 0) < v_item.required_qty THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format(
            'Stock físico insuficiente en bodega para enviar %s (%s). En existencia: %s, requerido: %s.',
            v_item.sku, v_item.product_name,
            COALESCE(v_wh_stock.stock_quantity, 0),
            v_item.required_qty
          )
        );
      END IF;
    END LOOP;

    FOR v_item IN
      SELECT * FROM public.order_items WHERE order_id = p_order_id ORDER BY id
    LOOP
      UPDATE public.warehouse_stock
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
          stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_item.quantity),
          updated_at = now()
      WHERE product_id = v_item.product_id
        AND warehouse_id = v_item.warehouse_id;

      IF NOT v_has_sync_trigger THEN
        UPDATE public.products
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
            stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_item.quantity)
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;
  END IF;

  -- CANCELLED/REJECTED: liberar reserva de la bodega de cada partida
  IF p_new_status IN ('cancelled', 'rejected') AND v_order.status IN ('confirmed', 'in_fulfillment') THEN
    FOR v_item IN
      SELECT * FROM public.order_items WHERE order_id = p_order_id ORDER BY id
    LOOP
      UPDATE public.warehouse_stock
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
          updated_at = now()
      WHERE product_id = v_item.product_id
        AND warehouse_id = v_item.warehouse_id;

      IF NOT v_has_sync_trigger THEN
        UPDATE public.products
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders SET status = p_new_status WHERE id = p_order_id;

  IF p_new_status = 'shipped' THEN
    UPDATE public.orders SET shipped_at = NOW() WHERE id = p_order_id;
  END IF;

  IF p_new_status = 'closed' THEN
    UPDATE public.orders SET delivered_at = NOW() WHERE id = p_order_id;
  END IF;

  IF p_new_status = 'rejected' AND p_rejection_reason IS NOT NULL THEN
    UPDATE public.orders SET rejection_reason = p_rejection_reason WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, TEXT) TO authenticated;

-- 4. update_order_item_quantity: usa la bodega de la partida (order_items.warehouse_id);
--    cuando el cambio de cantidad requiere ajustar inventario o reserva (estados
--    confirmed, in_fulfillment, shipped, closed) y falta warehouse_id, devuelve un
--    mensaje claro ANTES de mover inventario.
CREATE OR REPLACE FUNCTION public.update_order_item_quantity(
  p_order_id UUID,
  p_item_id UUID,
  p_new_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_item RECORD;
  v_wh_stock RECORD;
  v_diff INTEGER;
  v_wh_id UUID;
  v_is_admin BOOLEAN;
  v_has_sync_trigger BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  v_is_admin := public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']);
  IF NOT v_is_admin THEN
    IF v_order.distributor_id IS DISTINCT FROM v_caller_id OR v_order.status != 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para modificar este pedido.');
    END IF;
  END IF;

  IF v_order.status IN ('cancelled', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se puede editar un pedido cancelado o rechazado');
  END IF;

  SELECT oi.*, p.sku, p.name AS product_name
  INTO v_item
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.id = p_item_id AND oi.order_id = p_order_id
  FOR UPDATE OF oi;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item no encontrado');
  END IF;

  v_wh_id := v_item.warehouse_id;

  IF p_new_quantity <= 0 THEN
    v_diff := -v_item.quantity;
  ELSE
    v_diff := p_new_quantity - v_item.quantity;
  END IF;

  -- Si el estado del pedido implica ajustar reserva o stock y hay cambio de cantidad, exigir bodega en la partida antes de mover inventario
  IF v_order.status IN ('confirmed', 'in_fulfillment', 'shipped', 'closed') AND v_diff != 0 THEN
    IF v_wh_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format(
          'La partida %s (%s) no tiene bodega asignada. Asigna una bodega a la partida antes de modificar su cantidad.',
          v_item.sku, v_item.product_name
        )
      );
    END IF;

    SELECT stock_quantity, reserved_quantity
    INTO v_wh_stock
    FROM public.warehouse_stock
    WHERE warehouse_id = v_wh_id AND product_id = v_item.product_id
    FOR UPDATE;

    IF v_diff > 0 THEN
      IF NOT FOUND OR (COALESCE(v_wh_stock.stock_quantity, 0) - COALESCE(v_wh_stock.reserved_quantity, 0)) < v_diff THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format(
            'Stock disponible insuficiente en bodega para incrementar %s (%s). Disponible: %s, adicional solicitado: %s.',
            v_item.sku, v_item.product_name,
            GREATEST(0, COALESCE(v_wh_stock.stock_quantity, 0) - COALESCE(v_wh_stock.reserved_quantity, 0)),
            v_diff
          )
        );
      END IF;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_product_stock'
      AND NOT tgisinternal
  ) INTO v_has_sync_trigger;

  IF p_new_quantity <= 0 THEN
    IF v_order.status IN ('shipped', 'closed') THEN
      UPDATE public.warehouse_stock
      SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff,
          updated_at = now()
      WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;

      IF NOT v_has_sync_trigger THEN
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff
        WHERE id = v_item.product_id;
      END IF;
    ELSIF v_order.status IN ('confirmed', 'in_fulfillment') THEN
      UPDATE public.warehouse_stock
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff),
          updated_at = now()
      WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;

      IF NOT v_has_sync_trigger THEN
        UPDATE public.products
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff)
        WHERE id = v_item.product_id;
      END IF;
    END IF;

    DELETE FROM public.order_items WHERE id = p_item_id AND order_id = p_order_id;
  ELSE
    IF v_diff != 0 THEN
      IF v_order.status IN ('shipped', 'closed') THEN
        UPDATE public.warehouse_stock
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff),
            updated_at = now()
        WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;

        IF NOT v_has_sync_trigger THEN
          UPDATE public.products
          SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff)
          WHERE id = v_item.product_id;
        END IF;
      ELSIF v_order.status IN ('confirmed', 'in_fulfillment') THEN
        UPDATE public.warehouse_stock
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff),
            updated_at = now()
        WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;

        IF NOT v_has_sync_trigger THEN
          UPDATE public.products
          SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff)
          WHERE id = v_item.product_id;
        END IF;
      END IF;
    END IF;

    UPDATE public.order_items
    SET quantity = p_new_quantity
    WHERE id = p_item_id AND order_id = p_order_id;
  END IF;

  UPDATE public.orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM public.order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_order_item_quantity(UUID, UUID, INTEGER) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_order_item_quantity(UUID, UUID, INTEGER) TO authenticated;

COMMIT;
