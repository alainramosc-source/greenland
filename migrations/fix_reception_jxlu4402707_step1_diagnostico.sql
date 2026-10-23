-- ============================================================
-- PASO 1 (SOLO LECTURA): Diagnóstico recepción JXLU4402707 / JXLU6460620
-- Corrección pedida: GL22 cantidad 2000 -> 2016, costo origen 6.80 -> 6.45 USD
-- Ejecutar en Supabase SQL Editor y pegar el resultado (un solo JSON).
-- ============================================================
WITH rec AS (
  SELECT * FROM container_receptions
  WHERE container_label ILIKE '%JXLU4402707%'
  ORDER BY created_at DESC LIMIT 1
),
prods AS (
  SELECT DISTINCT cri.product_id FROM container_reception_items cri JOIN rec ON rec.id = cri.reception_id
)
SELECT jsonb_pretty(jsonb_build_object(
  'reception', (SELECT to_jsonb(r) - 'notes' FROM rec r),
  'items', (
    SELECT jsonb_agg(jsonb_build_object(
      'item_id', cri.id, 'sku', p.sku, 'qty', cri.quantity,
      'unit_origin_cost', cri.unit_origin_cost, 'unit_landed_cost', cri.unit_landed_cost,
      'warehouse', w.name, 'warehouse_id', cri.warehouse_id
    ) ORDER BY p.sku)
    FROM container_reception_items cri
    JOIN rec ON rec.id = cri.reception_id
    JOIN products p ON p.id = cri.product_id
    LEFT JOIN warehouses w ON w.id = cri.warehouse_id
  ),
  'products_now', (
    SELECT jsonb_agg(jsonb_build_object(
      'sku', p.sku, 'avg_cost', p.avg_cost,
      'stock', (SELECT jsonb_object_agg(w.name, ws.stock_quantity) FROM warehouse_stock ws JOIN warehouses w ON w.id = ws.warehouse_id WHERE ws.product_id = p.id AND ws.stock_quantity <> 0)
    ) ORDER BY p.sku)
    FROM products p WHERE p.id IN (SELECT product_id FROM prods)
  ),
  'later_receptions_same_products', (
    SELECT jsonb_agg(jsonb_build_object('reception', cr.container_label, 'date', cr.reception_date, 'sku', p.sku, 'qty', cri.quantity))
    FROM container_reception_items cri
    JOIN container_receptions cr ON cr.id = cri.reception_id
    JOIN products p ON p.id = cri.product_id
    WHERE cr.status = 'completed' AND cri.product_id IN (SELECT product_id FROM prods)
      AND cr.created_at > (SELECT created_at FROM rec) AND cr.id <> (SELECT id FROM rec)
  ),
  'gl22_po', (
    SELECT jsonb_build_object('po_number', po.po_number, 'status', po.status)
    FROM purchase_orders po WHERE po.id = (SELECT purchase_order_id FROM rec)
  ),
  'gl22_transits_left', (
    SELECT jsonb_agg(jsonb_build_object('id', t.id, 'qty', t.quantity, 'status', t.status))
    FROM transit_shipments t
    WHERE t.purchase_order_id = (SELECT purchase_order_id FROM rec)
      AND t.product_id = (SELECT id FROM products WHERE sku = 'GL22')
  ),
  'gl22_stock_logs', (
    SELECT jsonb_agg(jsonb_build_object('when', l.created_at, 'change', l.quantity_change, 'reason', l.reason) ORDER BY l.created_at DESC)
    FROM (SELECT * FROM inventory_logs WHERE product_id = (SELECT id FROM products WHERE sku = 'GL22') ORDER BY created_at DESC LIMIT 10) l
  )
)) AS diagnostico;
