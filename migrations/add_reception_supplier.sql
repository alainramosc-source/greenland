-- Add supplier reference to container_receptions
ALTER TABLE container_receptions ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
