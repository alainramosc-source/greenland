-- ============================================================
-- RETAIL SALE RPC — Warehouse-aware sale from inbox chat
-- Deducts from warehouse_stock (not distributor_inventory)
-- ============================================================

CREATE OR REPLACE FUNCTION create_retail_sale(
  p_conversation_id UUID DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
  p_delivery_type TEXT DEFAULT 'delivery',
  p_items JSONB DEFAULT '[]',
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_token TEXT;
  v_order_number TEXT;
  v_item JSONB;
  v_subtotal NUMERIC := 0;
  v_stock INT;
  v_wh_name TEXT;
BEGIN
  -- Validate warehouse
  IF p_warehouse_id IS NULL THEN
    -- Default to Vito Alessio
    SELECT id INTO p_warehouse_id FROM warehouses WHERE code = 'vito-alessio';
  END IF;

  SELECT name INTO v_wh_name FROM warehouses WHERE id = p_warehouse_id;

  -- Generate unique token and order number
  v_token := encode(gen_random_bytes(8), 'hex');
  v_order_number := 'VP-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(v_token, 1, 4));

  -- Calculate subtotal
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + ((v_item->>'quantity')::INT * (v_item->>'sale_price')::NUMERIC);
  END LOOP;

  -- Create the lastmile order
  INSERT INTO lastmile_orders (
    distributor_id, conversation_id, checkout_token, order_number,
    delivery_type, items, subtotal, total, notes, status
  ) VALUES (
    auth.uid(), p_conversation_id, v_token, v_order_number,
    p_delivery_type, p_items, v_subtotal, v_subtotal, p_notes,
    CASE WHEN p_delivery_type = 'pickup' THEN 'confirmed' ELSE 'pending' END
  )
  RETURNING id INTO v_order_id;

  -- Deduct stock from warehouse for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity INTO v_stock FROM warehouse_stock
    WHERE warehouse_id = p_warehouse_id AND product_id = (v_item->>'product_id')::UUID;

    IF v_stock IS NOT NULL AND v_stock >= (v_item->>'quantity')::INT THEN
      -- Deduct warehouse stock
      UPDATE warehouse_stock
      SET stock_quantity = stock_quantity - (v_item->>'quantity')::INT, updated_at = now()
      WHERE warehouse_id = p_warehouse_id AND product_id = (v_item->>'product_id')::UUID;

      -- Log inventory change
      INSERT INTO inventory_logs (user_id, product_id, quantity_change, reason)
      VALUES (
        auth.uid(),
        (v_item->>'product_id')::UUID,
        -(v_item->>'quantity')::INT,
        'Venta a público - Orden ' || v_order_number || ' [Bodega: ' || v_wh_name || ']'
      );
    END IF;
  END LOOP;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_retail_sale TO authenticated;
