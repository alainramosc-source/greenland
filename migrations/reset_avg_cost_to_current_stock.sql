-- =============================================================================
-- Corrección única del costo promedio (avg_cost) — "reiniciar el punto de partida"
-- =============================================================================
-- El costo promedio móvil arrancó (mayo 2026) con el promedio de TODAS las
-- recepciones históricas, incluyendo mercancía ya vendida. Aquí se reemplaza
-- por el costo de lo que REALMENTE está en existencia hoy (se toman las
-- recepciones más recientes hasta cubrir el stock actual).
-- A partir de aquí cada nueva llegada vuelve a promediar normal:
--   (stock × costo actual + piezas nuevas × costo nuevo) / stock total
--
-- Paso 1 guarda respaldo. Paso 2 corrige. Paso 3 verifica.
-- Solo toca SKUs donde las recepciones cubren el 100% del stock.
-- =============================================================================

-- 1. Respaldo de los costos actuales
CREATE TABLE IF NOT EXISTS products_avg_cost_backup_20261103 AS
SELECT id, sku, avg_cost, NOW() AS backed_up_at FROM products;
ALTER TABLE products_avg_cost_backup_20261103 ENABLE ROW LEVEL SECURITY;  -- sin políticas: solo SQL Editor

-- 2. Corrección
WITH stock AS (
  SELECT product_id, SUM(stock_quantity) AS stock_total
  FROM warehouse_stock GROUP BY product_id
),
rec AS (
  SELECT cri.product_id, cri.quantity, cri.unit_landed_cost,
         SUM(cri.quantity) OVER (PARTITION BY cri.product_id
             ORDER BY cr.reception_date DESC, cr.created_at DESC
             ROWS UNBOUNDED PRECEDING) AS acumulado
  FROM container_reception_items cri
  JOIN container_receptions cr ON cr.id = cri.reception_id
  WHERE cr.status = 'completed' AND cri.unit_landed_cost > 0 AND cri.quantity > 0
),
capas AS (
  SELECT r.product_id, r.unit_landed_cost,
         LEAST(r.quantity, GREATEST(s.stock_total - (r.acumulado - r.quantity), 0)) AS usado
  FROM rec r JOIN stock s ON s.product_id = r.product_id
),
nuevo AS (
  SELECT c.product_id,
         ROUND(SUM(c.usado * c.unit_landed_cost) / NULLIF(SUM(c.usado), 0), 2) AS costo_real,
         SUM(c.usado) AS cubiertas,
         MAX(s.stock_total) AS stock_total
  FROM capas c JOIN stock s ON s.product_id = c.product_id
  WHERE s.stock_total > 0
  GROUP BY c.product_id
)
UPDATE products p
   SET avg_cost = n.costo_real
  FROM nuevo n
 WHERE p.id = n.product_id
   AND n.costo_real > 0
   AND n.cubiertas >= n.stock_total          -- solo si las recepciones cubren todo el stock
   AND p.avg_cost IS DISTINCT FROM n.costo_real;

-- 3. Verificación: antes vs después
SELECT p.sku, b.avg_cost AS antes, p.avg_cost AS despues,
       ROUND((p.avg_cost - b.avg_cost) / NULLIF(b.avg_cost, 0) * 100, 1) AS cambio_pct
FROM products p
JOIN products_avg_cost_backup_20261103 b ON b.id = p.id
WHERE p.avg_cost IS DISTINCT FROM b.avg_cost
ORDER BY cambio_pct DESC;

-- (Para regresar, si hiciera falta)
-- UPDATE products p SET avg_cost = b.avg_cost
--   FROM products_avg_cost_backup_20261103 b WHERE b.id = p.id;
