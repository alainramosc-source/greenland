-- Verificar que las columnas existen
-- Si alguna falla, es que no se creó correctamente

-- Re-agregar columnas por si no se ejecutó bien el SQL anterior
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS approved_by_1 UUID;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS approved_at_1 TIMESTAMPTZ;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS approved_by_2 UUID;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS approved_at_2 TIMESTAMPTZ;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS registered_by TEXT;

-- Actualizar todos los registros existentes que no tengan approval_status
UPDATE cash_movements SET approval_status = 'approved' WHERE approval_status IS NULL;
