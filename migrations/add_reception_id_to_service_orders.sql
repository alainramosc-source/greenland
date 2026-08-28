-- ============================================================
-- MIGRATION: Add reception_id to service_orders
-- Links transport/service orders directly to container receptions
-- ============================================================

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS reception_id UUID REFERENCES container_receptions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_service_orders_reception_id ON service_orders(reception_id);
