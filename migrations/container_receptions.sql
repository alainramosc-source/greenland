-- ================================================
-- Container Receptions Module — Database Schema
-- ================================================

-- Table: container_receptions
-- Stores each container reception event with costs and charges
CREATE TABLE IF NOT EXISTS container_receptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  distributor_id UUID REFERENCES profiles(id),        -- PRO destino (NULL si Saltillo)
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  reception_date DATE NOT NULL DEFAULT CURRENT_DATE,
  container_label TEXT,                                -- "Container 1 - Freeman TL"
  pedimento_number TEXT,
  -- Costos adicionales (admin ingresa)
  freight_maritime NUMERIC(12,2) DEFAULT 0,
  freight_national NUMERIC(12,2) DEFAULT 0,
  import_taxes NUMERIC(12,2) DEFAULT 0,
  port_handling NUMERIC(12,2) DEFAULT 0,
  customs_broker NUMERIC(12,2) DEFAULT 0,
  other_costs NUMERIC(12,2) DEFAULT 0,
  other_costs_description TEXT,
  -- Exchange rates
  exchange_rate_goods NUMERIC(10,4) DEFAULT 1,         -- TC mercancía
  exchange_rate_freight NUMERIC(10,4) DEFAULT 1,       -- TC flete marítimo
  -- Totales calculados
  total_origin_cost NUMERIC(12,2) DEFAULT 0,           -- suma(qty × unit_origin_cost)
  total_additional_costs NUMERIC(12,2) DEFAULT 0,       -- suma de costos adicionales
  total_landed_cost NUMERIC(12,2) DEFAULT 0,            -- origin + additional
  charge_amount NUMERIC(12,2) DEFAULT 0,                -- monto cargado al PRO
  -- Meta
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Table: container_reception_items
-- Individual SKU lines within a reception
CREATE TABLE IF NOT EXISTS container_reception_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reception_id UUID NOT NULL REFERENCES container_receptions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL DEFAULT 0,
  unit_origin_cost NUMERIC(12,2) DEFAULT 0,   -- costo unitario factura china (USD o MXN)
  unit_landed_cost NUMERIC(12,2) DEFAULT 0,   -- costo unitario puesto en almacén (calculado)
  unit_pro_price NUMERIC(12,2),               -- precio unitario para el PRO (admin define, NULL si no aplica)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE container_receptions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access receptions" ON container_receptions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- PRO sees only their own receptions
CREATE POLICY "PRO sees own receptions" ON container_receptions
  FOR SELECT USING (distributor_id = auth.uid());

ALTER TABLE container_reception_items ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access reception_items" ON container_reception_items
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- PRO sees only items from their receptions
CREATE POLICY "PRO sees own reception items" ON container_reception_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM container_receptions cr 
    WHERE cr.id = reception_id AND cr.distributor_id = auth.uid()
  ));

-- ================================================
-- Indexes for performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_receptions_distributor ON container_receptions(distributor_id);
CREATE INDEX IF NOT EXISTS idx_receptions_warehouse ON container_receptions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_receptions_po ON container_receptions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_receptions_status ON container_receptions(status);
CREATE INDEX IF NOT EXISTS idx_reception_items_reception ON container_reception_items(reception_id);
CREATE INDEX IF NOT EXISTS idx_reception_items_product ON container_reception_items(product_id);
