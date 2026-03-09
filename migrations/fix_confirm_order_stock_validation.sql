-- ============================================================
-- FIX: Validar stock de bodega antes de confirmar pedido
-- La función confirm_order ahora verifica que cada item tenga
-- suficiente stock disponible en la bodega asignada antes de
-- permitir la confirmación.
-- ============================================================

CREATE OR REPLACE FUNCTION confirm_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_available INT;
  v_warehouse_name TEXT;
  v_product_name TEXT;
BEGIN
  -- Verificar que el pedido existe y está pendiente
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;
  
  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden confirmar pedidos en estado Pendiente');
  END IF;

  -- Validar que todos los items tengan bodega asignada
  IF EXISTS (SELECT 1 FROM order_items WHERE order_id = p_order_id AND warehouse_id IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Todos los productos deben tener una bodega asignada antes de confirmar');
  END IF;

  -- Validar stock disponible en bodega para cada item
  FOR v_item IN 
    SELECT oi.*, p.name as product_name
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
  LOOP
    -- Obtener stock disponible en la bodega asignada
    SELECT COALESCE(ws.stock_quantity, 0) - COALESCE(ws.reserved_quantity, 0)
    INTO v_available
    FROM warehouse_stock ws
    WHERE ws.warehouse_id = v_item.warehouse_id 
      AND ws.product_id = v_item.product_id;

    -- Si no hay registro en warehouse_stock, disponible = 0
    IF v_available IS NULL THEN
      v_available := 0;
    END IF;

    -- Obtener nombre de bodega para el mensaje de error
    SELECT name INTO v_warehouse_name FROM warehouses WHERE id = v_item.warehouse_id;

    IF v_available < v_item.quantity THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', format(
          'Stock insuficiente para "%s" en bodega "%s". Disponible: %s, Requerido: %s',
          v_item.product_name,
          COALESCE(v_warehouse_name, 'Sin nombre'),
          v_available,
          v_item.quantity
        )
      );
    END IF;
  END LOOP;

  -- Recalcular total basado en items actuales (por si el admin editó cantidades)
  UPDATE orders 
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  -- Reservar inventario en warehouse_stock para cada item
  FOR v_item IN 
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    -- Reservar en la bodega específica
    UPDATE warehouse_stock 
    SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_item.quantity
    WHERE warehouse_id = v_item.warehouse_id 
      AND product_id = v_item.product_id;

    -- También actualizar el total en products (por el trigger de sync)
    UPDATE products 
    SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- Cambiar estado a confirmado
  UPDATE orders 
  SET status = 'confirmed',
      confirmed_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
