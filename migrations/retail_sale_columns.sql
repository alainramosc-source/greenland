-- ============================================================
-- Add payment_status to lastmile_orders for retail sales tracking
-- ============================================================

ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid'));
ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS warehouse_name TEXT;
