-- =============================================
-- FLUJO DE CAJA + GREENLAND RECYCLING
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Firma dual en cash_movements
ALTER TABLE cash_movements 
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by_1 UUID,
  ADD COLUMN IF NOT EXISTS approved_at_1 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_2 UUID,
  ADD COLUMN IF NOT EXISTS approved_at_2 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registered_by TEXT;

-- 2. Tipos de material (categorías dinámicas)
CREATE TABLE IF NOT EXISTS recycling_material_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  buy_price_per_kg DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Proveedores de tungsteno
CREATE TABLE IF NOT EXISTS recycling_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Compras de tungsteno
CREATE TABLE IF NOT EXISTS recycling_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT NOT NULL,
  material_type_id UUID REFERENCES recycling_material_types(id),
  supplier_id UUID REFERENCES recycling_suppliers(id),
  supplier_name TEXT DEFAULT 'Público en General',
  quantity_kg DECIMAL(10,3) NOT NULL,
  price_per_kg DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  notes TEXT,
  purchased_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Ventas de tungsteno
CREATE TABLE IF NOT EXISTS recycling_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT NOT NULL,
  material_type_id UUID REFERENCES recycling_material_types(id),
  quantity_kg DECIMAL(10,3) NOT NULL,
  price_per_kg DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  buyer_name TEXT,
  notes TEXT,
  sold_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Datos iniciales
INSERT INTO recycling_suppliers (name, notes) 
VALUES ('Público en General', 'Proveedor genérico para compras al público')
ON CONFLICT DO NOTHING;

INSERT INTO recycling_material_types (name, buy_price_per_kg) VALUES
  ('Misceláneo', 0),
  ('Herramienta', 0),
  ('Inserto', 0),
  ('Mina', 0),
  ('Morgan Roll', 0)
ON CONFLICT DO NOTHING;

-- 7. RLS policies
ALTER TABLE recycling_material_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON recycling_material_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON recycling_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON recycling_purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON recycling_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
