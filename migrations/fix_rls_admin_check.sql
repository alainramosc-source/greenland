-- ============================================================
-- FIX: Create a SECURITY DEFINER function to check admin role
-- This bypasses RLS recursion on the profiles table
-- ============================================================

-- Step 1: Create helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Step 2: Drop the problematic self-referencing policies on profiles
DROP POLICY IF EXISTS "Users see own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

-- Step 3: Recreate profiles policies using the helper function (no recursion)
CREATE POLICY "Users see own profile" ON profiles FOR SELECT USING (
  auth.uid() = id OR public.is_admin()
);

CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (
  auth.uid() = id OR public.is_admin()
);

-- Step 4: Also fix all other policies that used the inline subquery
-- Orders
DROP POLICY IF EXISTS "Users see own orders" ON orders;
CREATE POLICY "Users see own orders" ON orders FOR SELECT USING (
  distributor_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "Users insert own orders" ON orders;
CREATE POLICY "Users insert own orders" ON orders FOR INSERT WITH CHECK (
  distributor_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "Admin updates orders" ON orders;
CREATE POLICY "Admin updates orders" ON orders FOR UPDATE USING (
  distributor_id = auth.uid() OR public.is_admin()
);

-- Order Items
DROP POLICY IF EXISTS "Users see own order items" ON order_items;
CREATE POLICY "Users see own order items" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_items.order_id
    AND (o.distributor_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS "Users insert own order items" ON order_items;
CREATE POLICY "Users insert own order items" ON order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_items.order_id
    AND (o.distributor_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS "Admin updates order items" ON order_items;
CREATE POLICY "Admin updates order items" ON order_items FOR UPDATE USING (
  public.is_admin()
);

DROP POLICY IF EXISTS "Admin deletes order items" ON order_items;
CREATE POLICY "Admin deletes order items" ON order_items FOR DELETE USING (
  public.is_admin()
);

-- Distributor Payments
DROP POLICY IF EXISTS "Users see own payments" ON distributor_payments;
CREATE POLICY "Users see own payments" ON distributor_payments FOR SELECT USING (
  distributor_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "Users insert own payments" ON distributor_payments;
CREATE POLICY "Users insert own payments" ON distributor_payments FOR INSERT WITH CHECK (
  distributor_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "Admin updates payments" ON distributor_payments;
CREATE POLICY "Admin updates payments" ON distributor_payments FOR UPDATE USING (
  public.is_admin()
);

-- Products
DROP POLICY IF EXISTS "Admin manages products" ON products;
CREATE POLICY "Admin manages products" ON products FOR ALL USING (
  public.is_admin()
);

-- Warehouse Stock
DROP POLICY IF EXISTS "Admin manages warehouse stock" ON warehouse_stock;
CREATE POLICY "Admin manages warehouse stock" ON warehouse_stock FOR ALL USING (
  public.is_admin()
);

-- Distributor Profiles (onboarding)
DROP POLICY IF EXISTS "Admins see all distributor profiles" ON distributor_profiles;
CREATE POLICY "Admins see all distributor profiles" ON distributor_profiles FOR SELECT USING (
  public.is_admin()
);

-- Distributor Documents
DROP POLICY IF EXISTS "Admins see all distributor documents" ON distributor_documents;
CREATE POLICY "Admins see all distributor documents" ON distributor_documents FOR SELECT USING (
  public.is_admin()
);

-- Distributor Contracts
DROP POLICY IF EXISTS "Admins see all contracts" ON distributor_contracts;
CREATE POLICY "Admins see all contracts" ON distributor_contracts FOR SELECT USING (
  public.is_admin()
);

-- Verification
DO $$
BEGIN
  IF public.is_admin() THEN
    RAISE NOTICE '✅ Admin check function works correctly';
  ELSE
    RAISE NOTICE '⚠️ Current user is not admin (expected if running as postgres)';
  END IF;
END $$;
