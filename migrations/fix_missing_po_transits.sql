-- ============================================================
-- SCRIPT UNIVERSAL DE RESTAURACIÓN DE TRÁNSITOS (TODAS LAS BODEGAS)
-- ============================================================
-- Este script audita TODAS las órdenes de compra vivas ('draft', 'sent', 'partially_received')
-- independientemente de la bodega destino (Vito Alessio, Tlalnepantla, Morelia, etc.)
-- y restaura cualquier tránsito que falte en transit_shipments.

WITH received_summary AS (
  SELECT 
    cr.purchase_order_id,
    cri.product_id,
    SUM(cri.quantity) AS total_received
  FROM container_receptions cr
  JOIN container_reception_items cri ON cri.reception_id = cr.id
  WHERE cr.status = 'completed'
    AND cr.purchase_order_id IS NOT NULL
  GROUP BY cr.purchase_order_id, cri.product_id
),
pending_transits AS (
  SELECT 
    po.po_number,
    po.id AS purchase_order_id,
    po.status AS po_status,
    po.created_at,
    po.created_by,
    po.destination_code,
    po.supplier_id,
    poi.product_id,
    poi.quantity AS total_ordenado,
    COALESCE(rs.total_received, 0) AS ya_recibido_bodega,
    (poi.quantity - COALESCE(rs.total_received, 0)) AS pendiente_en_transito
  FROM purchase_orders po
  JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
  LEFT JOIN received_summary rs 
    ON rs.purchase_order_id = po.id 
   AND rs.product_id = poi.product_id
  WHERE po.status IN ('draft', 'sent', 'partially_received')
)
INSERT INTO transit_shipments (
  product_id, 
  warehouse_id, 
  quantity, 
  estimated_arrival, 
  origin, 
  status, 
  purchase_order_id, 
  created_by
)
SELECT 
  pt.product_id,
  w.id AS warehouse_id,
  pt.pendiente_en_transito AS quantity,
  COALESCE(
    (pt.created_at::date + ((COALESCE(s.production_lead_weeks, 4) + COALESCE(s.transit_lead_weeks, 5)) || ' weeks')::interval)::date,
    CURRENT_DATE + INTERVAL '60 days'
  ) AS estimated_arrival,
  COALESCE(s.short_name, 'Proveedor') AS origin,
  'in_transit' AS status,
  pt.purchase_order_id,
  pt.created_by
FROM pending_transits pt
LEFT JOIN suppliers s ON s.id = pt.supplier_id
CROSS JOIN LATERAL (
  SELECT id FROM warehouses 
  WHERE name ILIKE '%' || COALESCE(pt.destination_code, '') || '%' 
     OR (pt.destination_code = 'VITO' AND name ILIKE '%Vito%')
     OR (pt.destination_code = 'SLW' AND name ILIKE '%Vito%')
     OR (pt.destination_code = 'TL' AND name ILIKE '%Tlaln%')
     OR (pt.destination_code = 'MRO' AND name ILIKE '%Morelia%')
     OR (pt.destination_code = 'QRO' AND name ILIKE '%Queretaro%')
     OR (pt.destination_code = 'ALT' AND name ILIKE '%Altamira%')
  LIMIT 1
) w
LEFT JOIN transit_shipments ts 
  ON ts.product_id = pt.product_id 
 AND ts.warehouse_id = w.id
 AND ts.status = 'in_transit'
 AND (
   ts.purchase_order_id = pt.purchase_order_id 
   OR (ts.purchase_order_id IS NULL AND ts.origin = s.short_name AND ts.quantity = pt.pendiente_en_transito)
 )
WHERE pt.pendiente_en_transito > 0
  AND ts.id IS NULL;
