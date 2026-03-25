-- ============================================================
-- DISTRIBUTOR PRO MIGRATION
-- Adds parent_distributor_id to profiles + RLS for zone visibility
-- ============================================================

-- 1. Add parent_distributor_id to profiles
-- NULL = reports to Greenland (admin) — normal distributor
-- UUID = reports to a distributor_pro — sub-distributor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_distributor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_parent_distributor ON profiles(parent_distributor_id) WHERE parent_distributor_id IS NOT NULL;

-- 3. Update orders RLS: distributor_pro can see orders from their sub-distributors
-- Drop existing SELECT policy and recreate with zone visibility
DO $$ BEGIN
  -- Drop existing policy
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users see own orders') THEN
    DROP POLICY "Users see own orders" ON orders;
  END IF;

  -- Recreate with distributor_pro zone visibility
  CREATE POLICY "Users see own orders" ON orders FOR SELECT USING (
    -- Own orders
    distributor_id = auth.uid()
    -- Admin sees all
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    -- Distributor PRO sees orders from their sub-distributors
    OR EXISTS (
      SELECT 1 FROM profiles sub
      WHERE sub.id = orders.distributor_id
      AND sub.parent_distributor_id = auth.uid()
    )
  );
END $$;

-- 4. Update order_items RLS: distributor_pro can see items from sub-distributor orders
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users see own order items') THEN
    DROP POLICY "Users see own order items" ON order_items;
  END IF;

  CREATE POLICY "Users see own order items" ON order_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_items.order_id
      AND (
        o.distributor_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (
          SELECT 1 FROM profiles sub
          WHERE sub.id = o.distributor_id
          AND sub.parent_distributor_id = auth.uid()
        )
      )
    )
  );
END $$;

-- 5. Distributor PRO can UPDATE orders from their sub-distributors (confirm, ship, etc.)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admin updates orders') THEN
    DROP POLICY "Admin updates orders" ON orders;
  END IF;

  CREATE POLICY "Admin updates orders" ON orders FOR UPDATE USING (
    distributor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM profiles sub
      WHERE sub.id = orders.distributor_id
      AND sub.parent_distributor_id = auth.uid()
    )
  );
END $$;

-- 6. Distributor PRO can see profiles of their sub-distributors
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users see own profile') THEN
    DROP POLICY "Users see own profile" ON profiles;
  END IF;

  CREATE POLICY "Users see own profile" ON profiles FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR parent_distributor_id = auth.uid()
  );
END $$;

-- 7. Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'parent_distributor_id') THEN
    RAISE NOTICE '✅ parent_distributor_id column added to profiles';
  ELSE
    RAISE NOTICE '❌ parent_distributor_id NOT found';
  END IF;
END $$;
