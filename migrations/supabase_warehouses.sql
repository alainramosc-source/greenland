-- ============================================
-- GREENLAND: Múltiples Bodegas — Migration
-- ============================================

-- 1. Tabla de Bodegas
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar las 2 bodegas
INSERT INTO warehouses (name, code) VALUES
  ('Bodega Vito Alessio', 'vito-alessio'),
  ('Bodega Echeverría', 'echeverria');

-- RLS para warehouses (todos pueden leer, solo admins modifican)
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read warehouses" ON warehouses FOR SELECT USING (true);
CREATE POLICY "Admins can manage warehouses" ON warehouses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Tabla de Stock por Bodega
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock_quantity INT DEFAULT 0,
  reserved_quantity INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

-- RLS para warehouse_stock
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read warehouse_stock" ON warehouse_stock FOR SELECT USING (true);
CREATE POLICY "Admins can manage warehouse_stock" ON warehouse_stock FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Agregar warehouse_id a order_items (nullable — para pedidos legacy)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

-- 4. Migrar stock existente: dividir 50/50 entre las dos bodegas
DO $$
DECLARE
  v_vito UUID;
  v_eche UUID;
BEGIN
  SELECT id INTO v_vito FROM warehouses WHERE code = 'vito-alessio';
  SELECT id INTO v_eche FROM warehouses WHERE code = 'echeverria';
  
  INSERT INTO warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
  SELECT v_vito, id, CEIL(stock_quantity::numeric / 2), CEIL(reserved_quantity::numeric / 2)
  FROM products WHERE is_active = true
  ON CONFLICT (warehouse_id, product_id) DO NOTHING;
  
  INSERT INTO warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
  SELECT v_eche, id, FLOOR(stock_quantity::numeric / 2), FLOOR(reserved_quantity::numeric / 2)
  FROM products WHERE is_active = true
  ON CONFLICT (warehouse_id, product_id) DO NOTHING;
END $$;

-- 5. Trigger: mantener products.stock_quantity sincronizado con suma de warehouse_stock
CREATE OR REPLACE FUNCTION sync_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_quantity = COALESCE((
    SELECT SUM(stock_quantity) FROM warehouse_stock WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  ), 0),
  reserved_quantity = COALESCE((
    SELECT SUM(reserved_quantity) FROM warehouse_stock WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  ), 0)
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_product_stock ON warehouse_stock;
CREATE TRIGGER trg_sync_product_stock
AFTER INSERT OR UPDATE OR DELETE ON warehouse_stock
FOR EACH ROW EXECUTE FUNCTION sync_product_stock();

-- 6. RPC: Transferencia entre bodegas
CREATE OR REPLACE FUNCTION transfer_stock(
  p_product_id UUID,
  p_from_warehouse_id UUID,
  p_to_warehouse_id UUID,
  p_quantity INT
)
RETURNS JSONB AS $$
DECLARE
  v_available INT;
BEGIN
  -- Check available stock in source warehouse
  SELECT (stock_quantity - reserved_quantity) INTO v_available
  FROM warehouse_stock
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
  
  IF v_available IS NULL OR v_available < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente en bodega origen. Disponible: ' || COALESCE(v_available, 0));
  END IF;
  
  -- Decrease source
  UPDATE warehouse_stock
  SET stock_quantity = stock_quantity - p_quantity, updated_at = now()
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
  
  -- Increase destination (upsert)
  INSERT INTO warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
  VALUES (p_to_warehouse_id, p_product_id, p_quantity, 0)
  ON CONFLICT (warehouse_id, product_id) DO UPDATE
  SET stock_quantity = warehouse_stock.stock_quantity + p_quantity, updated_at = now();
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Asignar bodega a un item de pedido
CREATE OR REPLACE FUNCTION assign_item_warehouse(
  p_item_id UUID,
  p_warehouse_id UUID
)
RETURNS JSONB AS $$
BEGIN
  UPDATE order_items
  SET warehouse_id = p_warehouse_id
  WHERE id = p_item_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item no encontrado');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: Ajustar stock en una bodega específica (reemplaza el inventory_logs directo)
CREATE OR REPLACE FUNCTION adjust_warehouse_stock(
  p_product_id UUID,
  p_warehouse_id UUID,
  p_quantity_change INT,
  p_reason TEXT DEFAULT 'Manual adjustment',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  -- Upsert warehouse_stock
  INSERT INTO warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
  VALUES (p_warehouse_id, p_product_id, GREATEST(p_quantity_change, 0), 0)
  ON CONFLICT (warehouse_id, product_id) DO UPDATE
  SET stock_quantity = GREATEST(warehouse_stock.stock_quantity + p_quantity_change, 0),
      updated_at = now();
  
  -- Log the adjustment
  INSERT INTO inventory_logs (user_id, product_id, quantity_change, reason)
  VALUES (COALESCE(p_user_id, auth.uid()), p_product_id, p_quantity_change, p_reason || ' [Bodega: ' || (SELECT name FROM warehouses WHERE id = p_warehouse_id) || ']');
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
