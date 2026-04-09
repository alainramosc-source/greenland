-- Add payment_method column to lastmile_orders
ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL;
