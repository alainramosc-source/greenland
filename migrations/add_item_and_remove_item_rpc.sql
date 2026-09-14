-- RPC function to add an item to an order
CREATE OR REPLACE FUNCTION add_item_to_order(
  p_order_id UUID,
  p_product_id UUID,
  p_quantity INT DEFAULT 1,
  p_unit_price NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit_price NUMERIC;
BEGIN
  IF p_unit_price <= 0 THEN
    SELECT price INTO v_unit_price FROM products WHERE id = p_product_id;
    IF v_unit_price IS NULL THEN v_unit_price := 0; END IF;
  ELSE
    v_unit_price := p_unit_price;
  END IF;

  -- Only insert quantity & unit_price (subtotal is generated column)
  INSERT INTO order_items (order_id, product_id, quantity, unit_price)
  VALUES (p_order_id, p_product_id, p_quantity, v_unit_price);

  -- Recalculate order total
  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC function to remove an item from an order
CREATE OR REPLACE FUNCTION remove_item_from_order(
  p_order_id UUID,
  p_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM order_items WHERE id = p_item_id AND order_id = p_order_id;

  -- Recalculate order total
  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
