-- ============================================================
-- MIGRATION: Add container_capacity to products
-- Stores how many pieces of each SKU fit in a single container
-- Used for optimizing mixed-container load planning
-- ============================================================

-- 1. Add column
ALTER TABLE products ADD COLUMN IF NOT EXISTS container_capacity INT DEFAULT 0;

-- 2. Populate with per-SKU container capacities
UPDATE products SET container_capacity = CASE sku
    WHEN 'GL01' THEN 1227
    WHEN 'GL02' THEN 2350
    WHEN 'GL03' THEN 2000
    WHEN 'GL04' THEN 1280
    WHEN 'GL05' THEN 1780
    WHEN 'GL06' THEN 800
    WHEN 'GL07' THEN 1160
    WHEN 'GL08' THEN 915
    WHEN 'GL09' THEN 1450
    WHEN 'GL10' THEN 915
    WHEN 'GL11' THEN 699
    WHEN 'GL12' THEN 582
    WHEN 'GL13' THEN 544
    WHEN 'GL14' THEN 2000
    WHEN 'GL15' THEN 1050
    WHEN 'GL16' THEN 1280
    WHEN 'GL17' THEN 2000
    WHEN 'GL18' THEN 535
    WHEN 'GL19' THEN 2450
    WHEN 'GL20' THEN 1227
    WHEN 'GL21' THEN 0
    WHEN 'GL22' THEN 2504
    WHEN 'GL23' THEN 2504
    WHEN 'GL24' THEN 0
    WHEN 'GL25' THEN 0
    ELSE 0
END;
