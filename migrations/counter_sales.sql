-- =====================================================
-- VENTA EN MOSTRADOR — Migration
-- Tabla para registrar ventas directas en bodega
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla counter_sales
CREATE TABLE IF NOT EXISTS counter_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_number TEXT UNIQUE NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id),
  sold_by UUID REFERENCES profiles(id),
  customer_name TEXT DEFAULT 'Público General',
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_counter_sales_created_at ON counter_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_counter_sales_warehouse ON counter_sales(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_counter_sales_sold_by ON counter_sales(sold_by);
CREATE INDEX IF NOT EXISTS idx_counter_sales_sale_number ON counter_sales(sale_number);

-- 3. RLS Policies
ALTER TABLE counter_sales ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to counter_sales"
  ON counter_sales
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Comments
COMMENT ON TABLE counter_sales IS 'Ventas directas en mostrador/bodega — POS';
COMMENT ON COLUMN counter_sales.sale_number IS 'Folio único: VMP-YYMMDD-NNN';
COMMENT ON COLUMN counter_sales.items IS 'Snapshot JSONB: [{sku, name, quantity, unit_price, subtotal}]';
COMMENT ON COLUMN counter_sales.status IS 'completed | cancelled';
