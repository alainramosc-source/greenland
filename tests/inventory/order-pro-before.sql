CREATE OR REPLACE FUNCTION public.add_item_to_order(p_order_id uuid, p_product_id uuid, p_quantity integer DEFAULT 1, p_unit_price numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_unit_price NUMERIC;
  v_is_admin BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  v_is_admin := public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']);
  IF NOT v_is_admin AND (v_order.distributor_id IS DISTINCT FROM v_caller_id OR v_order.status != 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para agregar productos a este pedido.');
  END IF;

  IF v_order.status IN ('cancelled', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se puede modificar un pedido cancelado o rechazado.');
  END IF;

  IF COALESCE(p_quantity, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La cantidad debe ser mayor a 0.');
  END IF;

  IF COALESCE(p_unit_price, 0) <= 0 OR NOT v_is_admin THEN
    SELECT price INTO v_unit_price FROM public.products WHERE id = p_product_id;
    IF v_unit_price IS NULL THEN v_unit_price := 0; END IF;
  ELSE
    v_unit_price := p_unit_price;
  END IF;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
  VALUES (p_order_id, p_product_id, p_quantity, v_unit_price);

  UPDATE public.orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM public.order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_item_warehouse(p_item_id uuid, p_warehouse_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID := auth.uid();
  v_item RECORD;
  v_old_wh UUID;
BEGIN
  IF v_caller_id IS NULL OR NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para reasignar bodega.');
  END IF;

  SELECT oi.product_id, oi.quantity, oi.warehouse_id, o.status
  INTO v_item
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = p_item_id
  FOR UPDATE OF oi;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item no encontrado');
  END IF;

  v_old_wh := v_item.warehouse_id;

  UPDATE public.order_items SET warehouse_id = p_warehouse_id WHERE id = p_item_id;

  IF v_item.status IN ('confirmed', 'in_fulfillment')
     AND p_warehouse_id IS NOT NULL
     AND v_old_wh IS DISTINCT FROM p_warehouse_id
  THEN
    IF v_old_wh IS NOT NULL THEN
      UPDATE public.warehouse_stock
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
          updated_at = now()
      WHERE warehouse_id = v_old_wh AND product_id = v_item.product_id;
    END IF;

    INSERT INTO public.warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
    VALUES (p_warehouse_id, v_item.product_id, 0, v_item.quantity)
    ON CONFLICT (warehouse_id, product_id) DO UPDATE
    SET reserved_quantity = COALESCE(public.warehouse_stock.reserved_quantity, 0) + v_item.quantity,
        updated_at = now();
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.block_distributor_manual_stock_adjust()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_role  text;
  v_ctx   text;
  v_outer text;
BEGIN
  -- Sin usuario (SQL Editor, cron, service role) → permitir
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'distributor' THEN
    RETURN NEW;  -- admins y demás roles sin cambios
  END IF;

  -- Función más externa de la pila de llamadas
  GET DIAGNOSTICS v_ctx = PG_CONTEXT;
  v_outer := (regexp_match(v_ctx, '.*function ([[:alnum:]_."]+)\('))[1];

  IF v_outer IS NOT NULL AND v_outer LIKE '%adjust_warehouse_stock%' THEN
    RAISE EXCEPTION 'Los ajustes de inventario solo los puede hacer un administrador. Registra tus salidas con "Venta al Público PRO".'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_retail_sale(p_conversation_id uuid DEFAULT NULL::uuid, p_warehouse_id uuid DEFAULT NULL::uuid, p_delivery_type text DEFAULT 'delivery'::text, p_items jsonb DEFAULT '[]'::jsonb, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_order_id UUID;
  v_token TEXT;
  v_order_number TEXT;
  v_item JSONB;
  v_subtotal NUMERIC := 0;
  v_stock INT;
  v_wh_name TEXT;
BEGIN
  IF p_warehouse_id IS NULL THEN
    SELECT id INTO p_warehouse_id FROM warehouses WHERE code = 'vito-alessio';
  END IF;

  SELECT name INTO v_wh_name FROM warehouses WHERE id = p_warehouse_id;

  v_token := encode(extensions.gen_random_bytes(8), 'hex');
  v_order_number := 'VP-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(v_token, 1, 4));

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + ((v_item->>'quantity')::INT * (v_item->>'sale_price')::NUMERIC);
  END LOOP;

  INSERT INTO lastmile_orders (
    distributor_id, conversation_id, checkout_token, order_number,
    delivery_type, items, subtotal, total, notes, status, warehouse_name, warehouse_id
  ) VALUES (
    auth.uid(), p_conversation_id, v_token, v_order_number,
    p_delivery_type, p_items, v_subtotal, v_subtotal, p_notes,
    CASE WHEN p_delivery_type = 'pickup' THEN 'confirmed' ELSE 'pending' END,
    v_wh_name, p_warehouse_id
  )
  RETURNING id INTO v_order_id;

  -- Envío a domicilio: el inventario sale al SURTIR (dispatch_lastmile_order)
  IF p_delivery_type = 'pickup' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      CONTINUE WHEN (v_item->>'product_id') IS NULL;

      SELECT stock_quantity INTO v_stock FROM warehouse_stock
      WHERE warehouse_id = p_warehouse_id AND product_id = (v_item->>'product_id')::UUID;

      IF v_stock IS NOT NULL AND v_stock >= (v_item->>'quantity')::INT THEN
        UPDATE warehouse_stock
        SET stock_quantity = stock_quantity - (v_item->>'quantity')::INT, updated_at = now()
        WHERE warehouse_id = p_warehouse_id AND product_id = (v_item->>'product_id')::UUID;

        INSERT INTO inventory_logs (user_id, product_id, quantity_change, reason)
        VALUES (
          auth.uid(),
          (v_item->>'product_id')::UUID,
          -(v_item->>'quantity')::INT,
          'Venta a público - Orden ' || v_order_number || ' [Bodega: ' || v_wh_name || ']'
        );
      END IF;
    END LOOP;

    UPDATE lastmile_orders SET stock_deducted_at = now() WHERE id = v_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'checkout_token', v_token,
    'order_number', v_order_number,
    'delivery_type', p_delivery_type,
    'total', v_subtotal,
    'warehouse', v_wh_name
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_item_from_order(p_order_id uuid, p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_is_admin BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  v_is_admin := public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']);
  IF NOT v_is_admin AND (v_order.distributor_id IS DISTINCT FROM v_caller_id OR v_order.status != 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para eliminar partidas de este pedido.');
  END IF;

  DELETE FROM public.order_items WHERE id = p_item_id AND order_id = p_order_id;

  UPDATE public.orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM public.order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_item_quantity(p_order_id uuid, p_item_id uuid, p_new_quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
