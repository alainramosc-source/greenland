-- ============================================================
-- FIX: Sync real reservations from confirmed/in_fulfillment orders
-- ============================================================

-- Step 1: Recalculate reserved_quantity in warehouse_stock from active orders
UPDATE warehouse_stock ws
SET reserved_quantity = COALESCE(
  (SELECT SUM(oi.quantity)
   FROM order_items oi
   JOIN orders o ON o.id = oi.order_id
   WHERE oi.product_id = ws.product_id
   AND o.status IN ('confirmed', 'in_fulfillment')
   AND oi.warehouse_id = ws.warehouse_id
  ), 0
);

-- Step 2: Recalculate products table reserved_quantity from warehouse_stock
UPDATE products p
SET reserved_quantity = COALESCE(
  (SELECT SUM(ws.reserved_quantity) FROM warehouse_stock ws WHERE ws.product_id = p.id), 0
);
