-- Add operation reference fields to container_receptions
ALTER TABLE container_receptions ADD COLUMN IF NOT EXISTS operation_number TEXT;       -- Ej: Op19
ALTER TABLE container_receptions ADD COLUMN IF NOT EXISTS customs_broker_ref TEXT;      -- Referencia del agente aduanal
