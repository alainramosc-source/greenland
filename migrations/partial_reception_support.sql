-- ============================================================
-- MIGRATION: Partial Reception Support for Purchase Orders
-- Adds 'partially_received' status for POs with multiple containers
-- ============================================================

-- 1. Drop existing check constraint and recreate with new status
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled'));
