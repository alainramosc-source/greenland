-- =====================================================
-- BARCODE SCANNING — Migration
-- Agrega fulfilled_quantity a order_items
-- Crea tabla scan_logs para auditoría de escaneos
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar fulfilled_quantity a order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS fulfilled_quantity INT DEFAULT 0;

COMMENT ON COLUMN order_items.fulfilled_quantity IS 'Cantidad surtida/verificada por escaneo. 0 = no verificado.';

-- 2. Crear tabla scan_logs (auditoría de cada escaneo individual)
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  context TEXT NOT NULL,            -- 'fulfillment' | 'reception' | 'counter_sale'
  reference_id UUID NOT NULL,       -- order_id, reception_id, o counter_sale_id
  product_id UUID REFERENCES products(id),
  sku TEXT NOT NULL,
  scanned_by UUID REFERENCES profiles(id),
  warehouse_id UUID REFERENCES warehouses(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes para scan_logs
CREATE INDEX IF NOT EXISTS idx_scan_logs_reference ON scan_logs(reference_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_context ON scan_logs(context);
CREATE INDEX IF NOT EXISTS idx_scan_logs_created_at ON scan_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_by ON scan_logs(scanned_by);

-- 4. RLS para scan_logs
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to scan_logs"
  ON scan_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Comments
COMMENT ON TABLE scan_logs IS 'Registro de cada escaneo individual para auditoría — surtido, recepción, venta';
COMMENT ON COLUMN scan_logs.context IS 'Tipo de operación: fulfillment, reception, counter_sale';
COMMENT ON COLUMN scan_logs.reference_id IS 'ID del pedido, recepción, o venta asociada';
