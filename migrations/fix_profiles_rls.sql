-- ============================================================
-- FIX: Restore profiles RLS policies
-- The distributor_pro migration may have broken them
-- ============================================================

-- 1. List current policies for diagnosis (check NOTICES tab)
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '--- Current profiles policies ---';
  FOR rec IN SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' LOOP
    RAISE NOTICE 'Policy: % | Command: %', rec.policyname, rec.cmd;
  END LOOP;
END $$;

-- 2. Drop ALL existing SELECT policies on profiles to start clean
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON profiles', rec.policyname);
    RAISE NOTICE 'Dropped SELECT policy: %', rec.policyname;
  END LOOP;
END $$;

-- 3. Recreate clean SELECT policy for profiles
CREATE POLICY "Users see own profile" ON profiles FOR SELECT USING (
  -- Everyone can see their own profile
  auth.uid() = id
  -- Admins can see all profiles
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  -- Distributor PRO can see their sub-distributors
  OR parent_distributor_id = auth.uid()
);

-- 4. Verify admin profile is intact
DO $$
DECLARE
  v_role TEXT;
  v_sub_role TEXT;
BEGIN
  SELECT role, sub_role INTO v_role, v_sub_role FROM profiles WHERE email = 'alain@greenland-products.com.mx';
  IF v_role IS NOT NULL THEN
    RAISE NOTICE '✅ Admin profile found: role=%, sub_role=%', v_role, v_sub_role;
  ELSE
    -- Try finding by another admin email
    SELECT role, sub_role INTO v_role, v_sub_role FROM profiles WHERE role = 'admin' LIMIT 1;
    IF v_role IS NOT NULL THEN
      RAISE NOTICE '✅ Admin profile found via role: role=%, sub_role=%', v_role, v_sub_role;
    ELSE
      RAISE NOTICE '❌ No admin profile found!';
    END IF;
  END IF;
END $$;

-- 5. Verify the policy was created
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT count(*) INTO cnt FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users see own profile';
  IF cnt > 0 THEN
    RAISE NOTICE '✅ Profiles SELECT policy recreated successfully';
  ELSE
    RAISE NOTICE '❌ Policy not found — check for errors above';
  END IF;
END $$;
