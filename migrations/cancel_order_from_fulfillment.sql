-- ============================================================
-- MIGRATION: Cancel Order from Fulfillment
-- Allows cancelling orders that are confirmed or in_fulfillment
-- Reverses: inventory reservation only. Payments are NOT touched.
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Cancelado por administrador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- 1. Verify order exists and is in a cancellable state
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;
  
  IF v_order.status NOT IN ('pending', 'confirmed', 'in_fulfillment') THEN
    RETURN jsonb_build_object('success', false, 'error', 
      'Solo se pueden cancelar pedidos en estado Pendiente, Confirmado o En Surtido.');
  END IF;

  -- 2. Release reserved inventory (only if was confirmed or in_fulfillment)
  IF v_order.status IN ('confirmed', 'in_fulfillment') THEN
    FOR v_item IN 
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      -- Release from products.reserved_quantity
      UPDATE products 
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
      WHERE id = v_item.product_id;
      
      -- Release from warehouse_stock.reserved_quantity (if warehouse was assigned)
      IF v_item.warehouse_id IS NOT NULL THEN
        UPDATE warehouse_stock
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
            updated_at = now()
        WHERE warehouse_id = v_item.warehouse_id 
          AND product_id = v_item.product_id;
      END IF;
    END LOOP;
  END IF;

  -- 3. Cancel order (payments are NOT deleted — they stay on the distributor's account)
  UPDATE orders 
  SET status = 'cancelled',
      rejection_reason = p_reason,
      notes = COALESCE(notes, '') || E'\n\n❌ CANCELADO: ' || p_reason || ' — ' || to_char(now(), 'DD/Mon/YYYY HH24:MI')
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'message', 'Pedido cancelado. Inventario liberado. Los pagos registrados se mantienen.');
END;
$$;
