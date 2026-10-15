-- ================================================
-- Multi-Warehouse Reception Support
-- Allows each container reception item to specify its destination warehouse
-- ================================================

ALTER TABLE container_reception_items 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

CREATE INDEX IF NOT EXISTS idx_reception_items_warehouse 
ON container_reception_items(warehouse_id);
