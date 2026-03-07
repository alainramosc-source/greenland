-- =============================================
-- PURCHASE ORDERS MODULE - Migration
-- =============================================

-- 1. Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  short_name text NOT NULL,
  contact_info text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed suppliers
INSERT INTO suppliers (name, short_name) VALUES
  ('HUZHOU SHINAIER FURNISHING CO.,LTD.', 'Shinaier'),
  ('GUANGDONG FREEMAN OUTDOOR CO.,LTD.', 'Freeman')
ON CONFLICT DO NOTHING;

-- 2. Supplier SKU mapping
CREATE TABLE IF NOT EXISTS supplier_sku_mapping (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_sku text NOT NULL,
  UNIQUE(product_id, supplier_id)
);

-- 3. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES suppliers(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','received','cancelled')),
  destination_code text,
  destination_port text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  supplier_sku text,
  quantity int NOT NULL DEFAULT 0,
  UNIQUE(purchase_order_id, product_id)
);

-- RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_sku_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins full access to suppliers') THEN
    CREATE POLICY "Admins full access to suppliers" ON suppliers FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins full access to supplier_sku_mapping') THEN
    CREATE POLICY "Admins full access to supplier_sku_mapping" ON supplier_sku_mapping FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins full access to purchase_orders') THEN
    CREATE POLICY "Admins full access to purchase_orders" ON purchase_orders FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins full access to purchase_order_items') THEN
    CREATE POLICY "Admins full access to purchase_order_items" ON purchase_order_items FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;
END $$;

-- 5. Seed SKU mappings
-- We need to match product SKUs to supplier SKUs
-- Shinaier = mesas y sillas, Freeman = toldos
DO $$
DECLARE
  shinaier_id uuid;
  freeman_id uuid;
BEGIN
  SELECT id INTO shinaier_id FROM suppliers WHERE short_name = 'Shinaier';
  SELECT id INTO freeman_id FROM suppliers WHERE short_name = 'Freeman';

  -- Shinaier products (mesas y sillas)
  INSERT INTO supplier_sku_mapping (product_id, supplier_id, supplier_sku)
  SELECT p.id, shinaier_id, m.supplier_sku
  FROM (VALUES
    ('GL01', 'SN-F180-6'),
    ('GL02', 'SN-F122-6'),
    ('GL03', 'SN-C04'),
    ('GL04', 'SN-F180-2W'),
    ('GL05', 'SN-F86'),
    ('GL06', 'SN-F244'),
    ('GL09', 'SN-F180-7'),
    ('GL14', 'SN-C04 BLACK'),
    ('GL15', 'SN-F180-15'),
    ('GL16', 'SN-F180-2R'),
    ('GL17', 'SN-C04R'),
    ('GL18', 'SN-RF154'),
    ('GL19', 'SN-76'),
    ('GL20', 'SN-F180-6 GREY'),
    ('GL22', 'SN-C17'),
    ('GL23', 'SN-C17 BLACK')
  ) AS m(sku, supplier_sku)
  JOIN products p ON p.sku = m.sku
  ON CONFLICT (product_id, supplier_id) DO UPDATE SET supplier_sku = EXCLUDED.supplier_sku;

  -- Freeman products (toldos y cobertizos)
  INSERT INTO supplier_sku_mapping (product_id, supplier_id, supplier_sku)
  SELECT p.id, freeman_id, m.supplier_sku
  FROM (VALUES
    ('GL07', '3×3 FOLDING TENT (WHITE FRAME)'),
    ('GL08', '3×3 FOLDING TENT (BLACK FRAME)'),
    ('GL10', '2×2 FOLDING TENT (WHITE FRAME)'),
    ('GL11', '2×3 FOLDING TENT (WHITE FRAME)'),
    ('GL12', '3×4.5 FOLDING TENT (WHITE FRAME)'),
    ('GL13', '3×6 FOLDING TENT (WHITE FRAME)'),
    ('GL21', 'SN-DSC600')
  ) AS m(sku, supplier_sku)
  JOIN products p ON p.sku = m.sku
  ON CONFLICT (product_id, supplier_id) DO UPDATE SET supplier_sku = EXCLUDED.supplier_sku;
END $$;
