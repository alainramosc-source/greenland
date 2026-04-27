-- =============================================
-- Fix: assign_item_warehouse now moves reserved_quantity
-- between warehouses when reassigning during in_fulfillment
-- =============================================

CREATE OR REPLACE FUNCTION assign_item_warehouse(
  p_item_id UUID,
  p_warehouse_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_item RECORD;
  v_old_wh UUID;
BEGIN
  -- Get item details
  SELECT oi.product_id, oi.quantity, oi.warehouse_id, o.status
  INTO v_item
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item no encontrado');
  END IF;

  v_old_wh := v_item.warehouse_id;

  -- Update the warehouse assignment
  UPDATE order_items SET warehouse_id = p_warehouse_id WHERE id = p_item_id;

  -- If order is already confirmed/in_fulfillment AND warehouses actually changed,
  -- move the reserved quantity from old warehouse to new warehouse
  IF v_item.status IN ('confirmed', 'in_fulfillment') 
     AND v_old_wh IS NOT NULL 
     AND p_warehouse_id IS NOT NULL 
     AND v_old_wh != p_warehouse_id THEN

    -- Release reservation from old warehouse
    UPDATE warehouse_stock
    SET reserved_quantity = GREATEST(0, reserved_quantity - v_item.quantity),
        updated_at = now()
    WHERE warehouse_id = v_old_wh AND product_id = v_item.product_id;

    -- Also update products table
    UPDATE products
    SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
    WHERE id = v_item.product_id;

    -- Add reservation to new warehouse
    INSERT INTO warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
    VALUES (p_warehouse_id, v_item.product_id, 0, v_item.quantity)
    ON CONFLICT (warehouse_id, product_id) DO UPDATE
    SET reserved_quantity = warehouse_stock.reserved_quantity + v_item.quantity,
        updated_at = now();

    -- Also update products table (re-add)
    UPDATE products
    SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_item.quantity
    WHERE id = v_item.product_id;

  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
