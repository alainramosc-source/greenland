-- =====================================================
-- 🚀 PRODUCTION CLEANUP — March 10, 2026
-- Wipes ALL test data. Keeps admin + product catalog.
-- RUN IN SUPABASE SQL EDITOR
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DELETE ALL TRANSACTIONAL DATA (FK-safe order)
-- =====================================================

-- Payments & bank first (they reference orders)
TRUNCATE TABLE bank_movements CASCADE;
TRUNCATE TABLE distributor_payments CASCADE;
TRUNCATE TABLE order_payments CASCADE;

-- Order-related (now safe)
TRUNCATE TABLE order_evidence CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;

-- Onboarding / Expedientes
TRUNCATE TABLE onboarding_audit_log CASCADE;
TRUNCATE TABLE distributor_contracts CASCADE;
TRUNCATE TABLE distributor_documents CASCADE;
TRUNCATE TABLE distributor_profiles CASCADE;

-- Distributor operational data
TRUNCATE TABLE distributor_inventory CASCADE;
TRUNCATE TABLE distributor_sales CASCADE;
TRUNCATE TABLE distributor_addresses CASCADE;

-- Pricing
TRUNCATE TABLE distributor_prices CASCADE;
TRUNCATE TABLE price_history CASCADE;

-- Inventory counting / adjustments
TRUNCATE TABLE inventory_count_lines CASCADE;
TRUNCATE TABLE inventory_count_sessions CASCADE;
TRUNCATE TABLE inventory_adjustments CASCADE;

-- Audit & notifications
TRUNCATE TABLE audit_log CASCADE;
TRUNCATE TABLE notifications CASCADE;

-- Purchase orders (supply chain)
TRUNCATE TABLE purchase_order_items CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;

-- =====================================================
-- 2. RESET WAREHOUSE STOCK TO ZERO
-- =====================================================
UPDATE warehouse_stock SET stock_quantity = 0, reserved_quantity = 0;

-- =====================================================
-- 3. RESET PRODUCT BASE PRICES TO ZERO
-- =====================================================
UPDATE products SET base_price = 0;

-- =====================================================
-- 4. DELETE ALL TEST USERS (keep admin only)
-- =====================================================
DELETE FROM profiles WHERE role != 'admin';
DELETE FROM auth.users WHERE id NOT IN (
  SELECT id FROM profiles WHERE role = 'admin'
);

-- =====================================================
-- 5. VERIFY
-- =====================================================
DO $$
DECLARE
  v_orders INT;
  v_payments INT;
  v_profiles INT;
  v_admin INT;
BEGIN
  SELECT COUNT(*) INTO v_orders FROM orders;
  SELECT COUNT(*) INTO v_payments FROM distributor_payments;
  SELECT COUNT(*) INTO v_profiles FROM profiles WHERE role = 'distributor';
  SELECT COUNT(*) INTO v_admin FROM profiles WHERE role = 'admin';

  RAISE NOTICE '======= CLEANUP DONE =======';
  RAISE NOTICE 'Pedidos: %', v_orders;
  RAISE NOTICE 'Pagos: %', v_payments;
  RAISE NOTICE 'Distribuidores: %', v_profiles;
  RAISE NOTICE 'Admins conservados: %', v_admin;
  RAISE NOTICE '============================';
END;
$$;

COMMIT;
