-- Fix: update_order_item_quantity must recalculate total_amount
CREATE OR REPLACE FUNCTION update_order_item_quantity(
  p_order_id UUID,
  p_item_id UUID,
  p_new_quantity INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_order_status TEXT;
  v_unit_price NUMERIC;
  v_new_total NUMERIC;
BEGIN
  -- Verify order is still in pending status
  SELECT status INTO v_order_status FROM orders WHERE id = p_order_id;
  IF v_order_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden editar pedidos pendientes');
  END IF;

  -- Update the quantity on the order item
  UPDATE order_items
  SET quantity = p_new_quantity,
      subtotal = unit_price * p_new_quantity
  WHERE id = p_item_id AND order_id = p_order_id;

  -- Recalculate order total
  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO v_new_total
  FROM order_items WHERE order_id = p_order_id;

  UPDATE orders SET total_amount = v_new_total WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'new_total', v_new_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
