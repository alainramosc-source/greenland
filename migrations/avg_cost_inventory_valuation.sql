-- ============================================
-- Inventory Valuation: Weighted Average Cost
-- ============================================

-- 1. Add avg_cost column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_cost numeric DEFAULT 0;

-- 2. Populate historical avg_cost from completed receptions
UPDATE products p SET avg_cost = sub.weighted_avg
FROM (
  SELECT 
    cri.product_id,
    SUM(cri.quantity * cri.unit_landed_cost) / NULLIF(SUM(cri.quantity), 0) AS weighted_avg
  FROM container_reception_items cri
  JOIN container_receptions cr ON cr.id = cri.reception_id
  WHERE cr.status = 'completed'
    AND cri.unit_landed_cost > 0
  GROUP BY cri.product_id
) sub
WHERE p.id = sub.product_id;

-- 3. Verify
SELECT sku, name, price, avg_cost 
FROM products 
WHERE is_active = true 
ORDER BY sku;
