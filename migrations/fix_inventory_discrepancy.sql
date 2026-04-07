-- ============================================================
-- FIX INVENTARIO COMPLETO — Bodega Vito Alessio
-- ============================================================
-- Ejecutar EN ORDEN en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PASO 1: Set stock a conteo físico (Bodega Vito Alessio)
-- ============================================================

UPDATE warehouse_stock SET stock_quantity = 148, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL01')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 1308, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL02')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 240, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL04')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 255, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL05')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 208, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL06')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 1033, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL07')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 565, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL08')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 2170, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL09')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 0, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL10')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 0, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL11')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 0, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL12')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 0, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL13')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 308, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL15')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 227, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL16')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 276, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL17')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 153, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL18')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 1423, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL19')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 3552, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL22')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

UPDATE warehouse_stock SET stock_quantity = 346, reserved_quantity = 0
WHERE product_id = (SELECT id FROM products WHERE sku = 'GL23')
AND warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

-- ============================================================
-- PASO 2: Re-aplicar reservas REALES (pedidos confirmed/in_fulfillment)
-- ============================================================

UPDATE warehouse_stock ws
SET reserved_quantity = COALESCE(
  (SELECT SUM(oi.quantity)
   FROM order_items oi
   JOIN orders o ON o.id = oi.order_id
   WHERE oi.product_id = ws.product_id
   AND o.status IN ('confirmed', 'in_fulfillment')
   AND oi.warehouse_id = ws.warehouse_id
  ), 0
)
WHERE ws.warehouse_id = (SELECT id FROM warehouses WHERE name ILIKE '%vito%' LIMIT 1);

-- ============================================================
-- PASO 3: Sync products table desde warehouse_stock (todas las bodegas)
-- ============================================================

UPDATE products p
SET stock_quantity = COALESCE(
      (SELECT SUM(ws.stock_quantity) FROM warehouse_stock ws WHERE ws.product_id = p.id), 0),
    reserved_quantity = COALESCE(
      (SELECT SUM(ws.reserved_quantity) FROM warehouse_stock ws WHERE ws.product_id = p.id), 0);

-- ============================================================
-- PASO 4: Fix update_order_status — descuenta al enviar
-- ============================================================

CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID, 
  p_new_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
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

  -- SHIPPED: Release reserved + deduct stock
  IF p_new_status = 'shipped' AND v_order.status = 'in_fulfillment' THEN
    FOR v_item IN 
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products 
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
          stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_item.quantity)
      WHERE id = v_item.product_id;

      UPDATE warehouse_stock
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
          stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_item.quantity)
      WHERE product_id = v_item.product_id
      AND warehouse_id = v_order.warehouse_id;
    END LOOP;
  END IF;

  -- CANCELLED/REJECTED: Release reserved only
  IF p_new_status IN ('cancelled', 'rejected') AND v_order.status IN ('confirmed', 'in_fulfillment') THEN
    FOR v_item IN 
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products 
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
      WHERE id = v_item.product_id;

      UPDATE warehouse_stock
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
      WHERE product_id = v_item.product_id
      AND warehouse_id = v_order.warehouse_id;
    END LOOP;
  END IF;

  UPDATE orders SET status = p_new_status WHERE id = p_order_id;

  IF p_new_status = 'shipped' THEN
    UPDATE orders SET shipped_at = NOW() WHERE id = p_order_id;
  END IF;

  IF p_new_status = 'closed' THEN
    UPDATE orders SET delivered_at = NOW() WHERE id = p_order_id;
  END IF;

  IF p_new_status = 'rejected' AND p_rejection_reason IS NOT NULL THEN
    UPDATE orders SET rejection_reason = p_rejection_reason WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- PASO 5: Fix update_order_item_quantity — ajusta inventario
-- Al subir cantidad: descuenta de stock (si shipped/closed) o reserva más (si confirmed/in_fulfillment)
-- Al bajar cantidad: devuelve a stock (si shipped/closed) o libera reserva (si confirmed/in_fulfillment)
-- ============================================================

CREATE OR REPLACE FUNCTION update_order_item_quantity(
  p_order_id UUID,
  p_item_id UUID,
  p_new_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_diff INTEGER;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  -- Allow edits on pending, confirmed, in_fulfillment, shipped, closed
  IF v_order.status IN ('cancelled', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se puede editar un pedido cancelado o rechazado');
  END IF;

  IF p_new_quantity <= 0 THEN
    -- Get item info before deleting
    SELECT * INTO v_item FROM order_items WHERE id = p_item_id AND order_id = p_order_id;
    IF FOUND THEN
      v_diff := -v_item.quantity; -- removing all units

      -- Adjust inventory based on order status
      IF v_order.status IN ('shipped', 'closed') THEN
        -- Items already left warehouse, return to stock
        UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff WHERE id = v_item.product_id;
        UPDATE warehouse_stock 
        SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff
        WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id;
      ELSIF v_order.status IN ('confirmed', 'in_fulfillment') THEN
        -- Release reservation
        UPDATE products SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff) WHERE id = v_item.product_id;
        UPDATE warehouse_stock 
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff)
        WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id;
      END IF;
    END IF;

    DELETE FROM order_items WHERE id = p_item_id AND order_id = p_order_id;
  ELSE
    SELECT * INTO v_item FROM order_items WHERE id = p_item_id AND order_id = p_order_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Item no encontrado');
    END IF;

    v_diff := p_new_quantity - v_item.quantity; -- positive = added more, negative = reduced

    IF v_diff != 0 THEN
      -- Adjust inventory based on order status
      IF v_order.status IN ('shipped', 'closed') THEN
        -- Shipped: adjust stock (positive diff = more shipped = less stock)
        UPDATE products 
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff)
        WHERE id = v_item.product_id;
        UPDATE warehouse_stock 
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff)
        WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id;
      ELSIF v_order.status IN ('confirmed', 'in_fulfillment') THEN
        -- Confirmed/fulfillment: adjust reservation
        UPDATE products 
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff)
        WHERE id = v_item.product_id;
        UPDATE warehouse_stock 
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff)
        WHERE product_id = v_item.product_id AND warehouse_id = v_order.warehouse_id;
      END IF;
    END IF;

    UPDATE order_items 
    SET quantity = p_new_quantity,
        subtotal = v_item.unit_price * p_new_quantity
    WHERE id = p_item_id AND order_id = p_order_id;
  END IF;

  -- Recalculate order total
  UPDATE orders 
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

SELECT p.sku, p.name, p.stock_quantity, p.reserved_quantity,
       p.stock_quantity - p.reserved_quantity AS disponible
FROM products p
WHERE p.stock_quantity > 0 OR p.reserved_quantity > 0
ORDER BY p.sku;
