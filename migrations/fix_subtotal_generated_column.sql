-- ============================================================
-- FIX: update_order_item_quantity
-- 1. Remove subtotal write (generated column)
-- 2. Use v_item.warehouse_id instead of v_order.warehouse_id
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

  IF v_order.status IN ('cancelled', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se puede editar un pedido cancelado o rechazado');
  END IF;

  IF p_new_quantity <= 0 THEN
    SELECT * INTO v_item FROM order_items WHERE id = p_item_id AND order_id = p_order_id;
    IF FOUND THEN
      v_diff := -v_item.quantity;

      IF v_order.status IN ('shipped', 'closed') THEN
        UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff WHERE id = v_item.product_id;
        IF v_item.warehouse_id IS NOT NULL THEN
          UPDATE warehouse_stock 
          SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff
          WHERE product_id = v_item.product_id AND warehouse_id = v_item.warehouse_id;
        END IF;
      ELSIF v_order.status IN ('confirmed', 'in_fulfillment') THEN
        UPDATE products SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff) WHERE id = v_item.product_id;
        IF v_item.warehouse_id IS NOT NULL THEN
          UPDATE warehouse_stock 
          SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff)
          WHERE product_id = v_item.product_id AND warehouse_id = v_item.warehouse_id;
        END IF;
      END IF;
    END IF;

    DELETE FROM order_items WHERE id = p_item_id AND order_id = p_order_id;
  ELSE
    SELECT * INTO v_item FROM order_items WHERE id = p_item_id AND order_id = p_order_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Item no encontrado');
    END IF;

    v_diff := p_new_quantity - v_item.quantity;

    IF v_diff != 0 THEN
      IF v_order.status IN ('shipped', 'closed') THEN
        UPDATE products 
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff)
        WHERE id = v_item.product_id;
        IF v_item.warehouse_id IS NOT NULL THEN
          UPDATE warehouse_stock 
          SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff)
          WHERE product_id = v_item.product_id AND warehouse_id = v_item.warehouse_id;
        END IF;
      ELSIF v_order.status IN ('confirmed', 'in_fulfillment') THEN
        UPDATE products 
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff)
        WHERE id = v_item.product_id;
        IF v_item.warehouse_id IS NOT NULL THEN
          UPDATE warehouse_stock 
          SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff)
          WHERE product_id = v_item.product_id AND warehouse_id = v_item.warehouse_id;
        END IF;
      END IF;
    END IF;

    -- Only update quantity (subtotal is generated)
    UPDATE order_items 
    SET quantity = p_new_quantity
    WHERE id = p_item_id AND order_id = p_order_id;
  END IF;

  -- Recalculate order total
  UPDATE orders 
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
