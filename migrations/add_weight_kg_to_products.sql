-- ============================================================
-- MIGRATION: Add weight_kg to products table
-- Stores individual unit weight in kg for load calculation
-- ============================================================

-- 1. Add weight_kg column
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10, 3) DEFAULT 0;

-- 2. Populate initial weights from known catalog specs
UPDATE products SET weight_kg = CASE sku
    WHEN 'GL01' THEN 12.35
    WHEN 'GL02' THEN 8.45
    WHEN 'GL03' THEN 4.30
    WHEN 'GL04' THEN 11.10
    WHEN 'GL05' THEN 9.70
    WHEN 'GL06' THEN 18.25
    WHEN 'GL07' THEN 19.70
    WHEN 'GL08' THEN 16.15
    WHEN 'GL09' THEN 10.65
    WHEN 'GL10' THEN 14.50
    WHEN 'GL11' THEN 18.00
    WHEN 'GL12' THEN 23.70
    WHEN 'GL13' THEN 32.90
    WHEN 'GL14' THEN 4.30
    WHEN 'GL15' THEN 13.00
    WHEN 'GL16' THEN 11.10
    WHEN 'GL17' THEN 4.50
    WHEN 'GL18' THEN 21.55
    WHEN 'GL19' THEN 4.50
    WHEN 'GL20' THEN 12.35
    WHEN 'GL22' THEN 4.30
    WHEN 'GL23' THEN 4.30
    WHEN 'GL26' THEN 2.581
    WHEN 'GL27' THEN 0.58
    WHEN 'GL28' THEN 5.075
    WHEN 'GL29' THEN 2.03
    ELSE weight_kg
END;
