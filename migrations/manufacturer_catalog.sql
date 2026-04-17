-- =============================================
-- Manufacturer vs Service Provider separation
-- =============================================

-- 1. Add type column to distinguish manufacturers from service providers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'service'
  CHECK (type IN ('manufacturer', 'service'));

-- 2. Add manufacturer-specific lead time columns
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS production_lead_weeks INT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS transit_lead_weeks INT;

-- 3. Mark Freeman and Shinaier as manufacturers with lead times
UPDATE suppliers SET 
  type = 'manufacturer', 
  production_lead_weeks = 4, 
  transit_lead_weeks = 5
WHERE short_name = 'Freeman';

UPDATE suppliers SET 
  type = 'manufacturer', 
  production_lead_weeks = 8, 
  transit_lead_weeks = 5
WHERE short_name = 'Shinaier';

-- 4. Mark any remaining suppliers as 'service' (safety)
UPDATE suppliers SET type = 'service' WHERE type IS NULL;
