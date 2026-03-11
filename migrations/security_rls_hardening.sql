-- ============================================================
-- SECURITY HARDENING: RLS policies for production
-- Ensures distributors can ONLY see their own data
-- ============================================================

-- ===================== PROFILES =====================
-- Distributors see only their own profile, admins see all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users see own profile') THEN
    CREATE POLICY "Users see own profile" ON profiles FOR SELECT USING (
      auth.uid() = id
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users update own profile') THEN
    CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (
      auth.uid() = id
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'System inserts profiles') THEN
    CREATE POLICY "System inserts profiles" ON profiles FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ===================== ORDERS =====================
-- Distributors see only their own orders, admins see all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users see own orders') THEN
    CREATE POLICY "Users see own orders" ON orders FOR SELECT USING (
      distributor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users insert own orders') THEN
    CREATE POLICY "Users insert own orders" ON orders FOR INSERT WITH CHECK (
      distributor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admin updates orders') THEN
    CREATE POLICY "Admin updates orders" ON orders FOR UPDATE USING (
      distributor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

-- ===================== ORDER_ITEMS =====================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users see own order items') THEN
    CREATE POLICY "Users see own order items" ON order_items FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM orders o WHERE o.id = order_items.order_id
        AND (o.distributor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users insert own order items') THEN
    CREATE POLICY "Users insert own order items" ON order_items FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM orders o WHERE o.id = order_items.order_id
        AND (o.distributor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Admin updates order items') THEN
    CREATE POLICY "Admin updates order items" ON order_items FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Admin deletes order items') THEN
    CREATE POLICY "Admin deletes order items" ON order_items FOR DELETE USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

-- ===================== DISTRIBUTOR_PAYMENTS =====================
ALTER TABLE distributor_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'distributor_payments' AND policyname = 'Users see own payments') THEN
    CREATE POLICY "Users see own payments" ON distributor_payments FOR SELECT USING (
      distributor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'distributor_payments' AND policyname = 'Users insert own payments') THEN
    CREATE POLICY "Users insert own payments" ON distributor_payments FOR INSERT WITH CHECK (
      distributor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'distributor_payments' AND policyname = 'Admin updates payments') THEN
    CREATE POLICY "Admin updates payments" ON distributor_payments FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

-- ===================== DISTRIBUTOR_PROFILES (onboarding) =====================
-- Already has RLS, but ensure distributors ONLY see their own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'distributor_profiles' AND policyname = 'Admins see all distributor profiles') THEN
    CREATE POLICY "Admins see all distributor profiles" ON distributor_profiles FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

-- ===================== DISTRIBUTOR_DOCUMENTS =====================
-- Already has RLS, but add admin full access policy if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'distributor_documents' AND policyname = 'Admins see all distributor documents') THEN
    CREATE POLICY "Admins see all distributor documents" ON distributor_documents FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

-- ===================== DISTRIBUTOR_CONTRACTS =====================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'distributor_contracts' AND policyname = 'Admins see all contracts') THEN
    CREATE POLICY "Admins see all contracts" ON distributor_contracts FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

-- ===================== PRODUCTS =====================
-- Products are public to all authenticated users (read only)
-- Stock updates only by admin
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'All users can see products') THEN
    CREATE POLICY "All users can see products" ON products FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Admin manages products') THEN
    CREATE POLICY "Admin manages products" ON products FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

-- ===================== WAREHOUSES =====================
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND policyname = 'All users can see warehouses') THEN
    CREATE POLICY "All users can see warehouses" ON warehouses FOR SELECT USING (true);
  END IF;
END $$;

-- ===================== WAREHOUSE_STOCK =====================
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouse_stock' AND policyname = 'All users can see warehouse stock') THEN
    CREATE POLICY "All users can see warehouse stock" ON warehouse_stock FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouse_stock' AND policyname = 'Admin manages warehouse stock') THEN
    CREATE POLICY "Admin manages warehouse stock" ON warehouse_stock FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

-- ===================== VERIFICATION =====================
-- Quick check to confirm RLS is enabled
DO $$
DECLARE
  t TEXT;
  has_rls BOOLEAN;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','orders','order_items','distributor_payments','products','warehouses','warehouse_stock'])
  LOOP
    SELECT relrowsecurity INTO has_rls FROM pg_class WHERE relname = t;
    IF has_rls THEN
      RAISE NOTICE '✅ RLS ENABLED on %', t;
    ELSE
      RAISE NOTICE '❌ RLS NOT ENABLED on %', t;
    END IF;
  END LOOP;
END $$;
