-- ============================================================
-- MIGRATION: Transit Shipments for Smart Coverage
-- Tracks individual shipments with arrival dates
-- ============================================================

-- 1. Create transit_shipments table
CREATE TABLE IF NOT EXISTS transit_shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  estimated_arrival DATE NOT NULL,
  origin TEXT,                          -- "Shinaier", "Freeman", nota libre
  status TEXT DEFAULT 'in_transit'      -- in_transit, arrived, cancelled
    CHECK (status IN ('in_transit', 'arrived', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_transit_product ON transit_shipments(product_id);
CREATE INDEX IF NOT EXISTS idx_transit_warehouse ON transit_shipments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transit_status ON transit_shipments(status);
CREATE INDEX IF NOT EXISTS idx_transit_arrival ON transit_shipments(estimated_arrival);

-- 3. RLS
ALTER TABLE transit_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access transit" ON transit_shipments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Authenticated read transit" ON transit_shipments
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Helper view: active transits summary per product+warehouse
CREATE OR REPLACE VIEW transit_summary AS
SELECT 
  product_id,
  warehouse_id,
  SUM(quantity) as total_in_transit,
  MIN(estimated_arrival) as next_arrival,
  COUNT(*) as shipment_count
FROM transit_shipments
WHERE status = 'in_transit'
GROUP BY product_id, warehouse_id;
