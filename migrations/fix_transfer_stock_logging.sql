-- ================================================
-- Fix: transfer_stock must log to inventory_logs + audit_log
-- ================================================

CREATE OR REPLACE FUNCTION transfer_stock(
  p_product_id UUID,
  p_from_warehouse_id UUID,
  p_to_warehouse_id UUID,
  p_quantity INT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_available INT;
  v_from_name TEXT;
  v_to_name TEXT;
  v_sku TEXT;
  v_product_name TEXT;
  v_stock_before_from INT;
  v_stock_before_to INT;
  v_uid UUID;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());

  SELECT name INTO v_from_name FROM warehouses WHERE id = p_from_warehouse_id;
  SELECT name INTO v_to_name FROM warehouses WHERE id = p_to_warehouse_id;
  SELECT sku, name INTO v_sku, v_product_name FROM products WHERE id = p_product_id;

  SELECT stock_quantity INTO v_stock_before_from
  FROM warehouse_stock
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;

  SELECT (stock_quantity - reserved_quantity) INTO v_available
  FROM warehouse_stock
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente en bodega origen. Disponible: ' || COALESCE(v_available, 0));
  END IF;

  SELECT stock_quantity INTO v_stock_before_to
  FROM warehouse_stock
  WHERE warehouse_id = p_to_warehouse_id AND product_id = p_product_id;
  v_stock_before_to := COALESCE(v_stock_before_to, 0);

  UPDATE warehouse_stock
  SET stock_quantity = stock_quantity - p_quantity, updated_at = now()
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;

  INSERT INTO warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
  VALUES (p_to_warehouse_id, p_product_id, p_quantity, 0)
  ON CONFLICT (warehouse_id, product_id) DO UPDATE
  SET stock_quantity = warehouse_stock.stock_quantity + p_quantity, updated_at = now();

  INSERT INTO inventory_logs (user_id, product_id, quantity_change, reason)
  VALUES (v_uid, p_product_id, -p_quantity,
    'Transferencia a ' || v_to_name || ' [Bodega: ' || v_from_name || ']');

  INSERT INTO inventory_logs (user_id, product_id, quantity_change, reason)
  VALUES (v_uid, p_product_id, p_quantity,
    'Transferencia desde ' || v_from_name || ' [Bodega: ' || v_to_name || ']');

  INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
  VALUES (v_uid, 'stock_transfer', 'product', p_product_id, jsonb_build_object(
    'sku', v_sku,
    'product', v_product_name,
    'from_warehouse', v_from_name,
    'to_warehouse', v_to_name,
    'quantity', p_quantity,
    'from_before', COALESCE(v_stock_before_from, 0),
    'from_after', COALESCE(v_stock_before_from, 0) - p_quantity,
    'to_before', v_stock_before_to,
    'to_after', v_stock_before_to + p_quantity
  ));

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
