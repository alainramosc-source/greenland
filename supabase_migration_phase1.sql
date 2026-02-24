-- ============================================================
-- FASE 1: Migración del Sistema de Pedidos B2B
-- Separación de flujo operativo y financiero
-- ============================================================
-- INSTRUCCIONES: Ejecutar este script en el SQL Editor de Supabase
-- ============================================================

-- 1. NUEVAS COLUMNAS EN orders
-- ------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address_id UUID;

-- 2. NUEVA TABLA: distributor_addresses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS distributor_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  distributor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FK en orders
ALTER TABLE orders 
  ADD CONSTRAINT fk_orders_shipping_address 
  FOREIGN KEY (shipping_address_id) 
  REFERENCES distributor_addresses(id) 
  ON DELETE SET NULL;

-- RLS para distributor_addresses
ALTER TABLE distributor_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own addresses" ON distributor_addresses
  FOR SELECT USING (auth.uid() = distributor_id);

CREATE POLICY "Users can insert own addresses" ON distributor_addresses
  FOR INSERT WITH CHECK (auth.uid() = distributor_id);

CREATE POLICY "Users can update own addresses" ON distributor_addresses
  FOR UPDATE USING (auth.uid() = distributor_id);

CREATE POLICY "Users can delete own addresses" ON distributor_addresses
  FOR DELETE USING (auth.uid() = distributor_id);

CREATE POLICY "Admins can view all addresses" ON distributor_addresses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. NUEVA TABLA: order_payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  reference TEXT,
  payment_date DATE NOT NULL,
  notes TEXT,
  registered_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para order_payments
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments" ON order_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Distributors can view own order payments" ON order_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_payments.order_id 
      AND orders.distributor_id = auth.uid()
    )
  );

-- 4. MIGRAR ESTADOS EXISTENTES
-- ------------------------------------------------------------
UPDATE orders SET status = 'confirmed' WHERE status = 'processing';
UPDATE orders SET status = 'closed' WHERE status = 'delivered';

-- Inicializar payment_status
UPDATE orders SET payment_status = 'paid' WHERE payment_confirmed_at IS NOT NULL;
UPDATE orders SET payment_status = 'unpaid' WHERE payment_status IS NULL OR payment_status = 'unpaid';

-- 5. NUEVA RPC: confirm_order (operativa, sin tocar financiero)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- Verificar que el pedido existe y está pendiente
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;
  
  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden confirmar pedidos en estado Pendiente');
  END IF;

  -- Recalcular total basado en items actuales (por si el admin editó cantidades)
  UPDATE orders 
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  -- Reservar inventario para cada item
  FOR v_item IN 
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products 
    SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- Cambiar estado a confirmado
  UPDATE orders 
  SET status = 'confirmed',
      confirmed_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. ACTUALIZAR RPC: update_order_status (nuevos estados válidos)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID, 
  p_new_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  -- Validar transiciones permitidas
  IF p_new_status = 'in_fulfillment' AND v_order.status != 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo pedidos confirmados pueden pasar a surtido');
  END IF;

  IF p_new_status = 'shipped' AND v_order.status != 'in_fulfillment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo pedidos en surtido pueden marcarse como enviados');
  END IF;

  IF p_new_status = 'closed' AND v_order.status != 'shipped' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo pedidos enviados pueden cerrarse');
  END IF;

  -- Si se cancela o rechaza un pedido confirmado/en surtido, liberar inventario reservado
  IF p_new_status IN ('cancelled', 'rejected') AND v_order.status IN ('confirmed', 'in_fulfillment') THEN
    FOR v_item IN 
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products 
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- Actualizar estado
  UPDATE orders SET status = p_new_status WHERE id = p_order_id;

  -- Registrar timestamps según estado
  IF p_new_status = 'shipped' THEN
    UPDATE orders SET shipped_at = NOW() WHERE id = p_order_id;
  END IF;

  IF p_new_status = 'closed' THEN
    UPDATE orders SET delivered_at = NOW() WHERE id = p_order_id;
  END IF;

  IF p_new_status = 'rejected' AND p_rejection_reason IS NOT NULL THEN
    UPDATE orders SET rejection_reason = p_rejection_reason WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. NUEVA RPC: register_payment (flujo financiero independiente)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION register_payment(
  p_order_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_reference TEXT,
  p_payment_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_total_paid NUMERIC;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  -- Insertar el pago
  INSERT INTO order_payments (order_id, amount, payment_method, reference, payment_date, notes, registered_by)
  VALUES (p_order_id, p_amount, p_payment_method, p_reference, p_payment_date, p_notes, auth.uid());

  -- Recalcular total pagado
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
  FROM order_payments 
  WHERE order_id = p_order_id;

  -- Actualizar payment_status
  IF v_total_paid >= v_order.total_amount THEN
    UPDATE orders SET payment_status = 'paid' WHERE id = p_order_id;
  ELSIF v_total_paid > 0 THEN
    UPDATE orders SET payment_status = 'partial' WHERE id = p_order_id;
  ELSE
    UPDATE orders SET payment_status = 'unpaid' WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'total_paid', v_total_paid);
END;
$$;

-- 8. NUEVA RPC: update_order_item_quantity (para editar cantidades en pendiente)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_order_item_quantity(
  p_order_id UUID,
  p_item_id UUID,
  p_new_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden editar pedidos pendientes');
  END IF;

  IF p_new_quantity <= 0 THEN
    -- Eliminar el item si la cantidad es 0 o menos
    DELETE FROM order_items WHERE id = p_item_id AND order_id = p_order_id;
  ELSE
    -- Actualizar cantidad y subtotal
    SELECT * INTO v_item FROM order_items WHERE id = p_item_id AND order_id = p_order_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Item no encontrado');
    END IF;

    UPDATE order_items 
    SET quantity = p_new_quantity,
        subtotal = v_item.unit_price * p_new_quantity
    WHERE id = p_item_id AND order_id = p_order_id;
  END IF;

  -- Recalcular total del pedido
  UPDATE orders 
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
