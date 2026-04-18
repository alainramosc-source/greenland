-- Add assigned warehouse to distributor PRO profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_warehouse_id UUID REFERENCES warehouses(id);

-- Assign Abraham (Tlalnepantla) - run this after finding his user ID and warehouse ID
-- UPDATE profiles SET assigned_warehouse_id = (SELECT id FROM warehouses WHERE name LIKE '%Tlalnepantla%' LIMIT 1)
-- WHERE full_name LIKE '%Abraham%Hedikel%' OR full_name LIKE '%Abraham%Borrego%';
