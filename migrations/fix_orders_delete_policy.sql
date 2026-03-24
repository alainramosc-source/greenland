-- Add missing DELETE policy for orders table
-- This was missing, causing delete operations to silently fail due to RLS

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admin deletes orders') THEN
    CREATE POLICY "Admin deletes orders" ON orders FOR DELETE USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;
