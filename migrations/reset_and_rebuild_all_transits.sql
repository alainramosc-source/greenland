-- ============================================================
-- SCRIPT DE RECONSTRUCCIÓN TOTAL Y REINICIO LIMPIO DE TRÁNSITOS
-- ============================================================
-- Este script borra todos los tránsitos activos en transit_shipments
-- y los vuelve a construir a partir de la verdad absoluta:
-- (purchase_orders - container_receptions completadas)

-- 1. LIMPIEZA TOTAL: Borrar tránsitos activos actuales
DELETE FROM transit_shipments 
WHERE status = 'in_transit';

-- 2. RECONSTRUCCIÓN DESDE CERO: Reinsertar tránsitos exactos para TODAS las bodegas
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
    po.id AS purchase_order_id,
    po.po_number,
    po.created_at,
    po.created_by,
    po.destination_code,
    po.supplier_id,
    poi.product_id,
    (poi.quantity - COALESCE(rs.total_received, 0)) AS remaining_quantity
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
  pt.remaining_quantity AS quantity,
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
  WHERE (pt.destination_code IN ('VITO', 'SLW', 'SALTILLO') AND (code = 'vito-alessio' OR name ILIKE '%Vito%'))
     OR (pt.destination_code = 'TL' AND (code = 'tlalnepantla' OR name ILIKE '%Tlaln%'))
     OR (pt.destination_code = 'MRO' AND (code = 'morelia' OR name ILIKE '%Morelia%'))
     OR (pt.destination_code = 'QRO' AND (code = 'queretaro' OR name ILIKE '%Queretaro%'))
     OR (pt.destination_code = 'ALT' AND (code = 'altamira' OR name ILIKE '%Altamira%'))
     OR (pt.destination_code IS NULL AND code = 'vito-alessio')
     OR (name ILIKE '%' || COALESCE(pt.destination_code, '') || '%')
  LIMIT 1
) w
WHERE pt.remaining_quantity > 0;
