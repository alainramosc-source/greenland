-- ===================================================
-- DISTRIBUTOR MINI INVENTORY - SCHEMA COMPLETO
-- Ejecutar TODO esto en Supabase SQL Editor
-- ===================================================

-- 1. Tabla: inventario del distribuidor
CREATE TABLE IF NOT EXISTS distributor_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(distributor_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_dist_inv_distributor ON distributor_inventory(distributor_id);

-- 2. Tabla: ventas del distribuidor
CREATE TABLE IF NOT EXISTS distributor_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    sale_price NUMERIC(10,2) NOT NULL,
    cost_price NUMERIC(10,2) NOT NULL,
    client_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dist_sales_distributor ON distributor_sales(distributor_id, created_at DESC);

-- 3. RLS: distributor_inventory
ALTER TABLE distributor_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Distributors see own inventory" ON distributor_inventory;
CREATE POLICY "Distributors see own inventory" ON distributor_inventory FOR SELECT
    USING (distributor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Distributors manage own inventory" ON distributor_inventory;
CREATE POLICY "Distributors manage own inventory" ON distributor_inventory FOR ALL
    USING (distributor_id = auth.uid());

-- 4. RLS: distributor_sales
ALTER TABLE distributor_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Distributors see own sales" ON distributor_sales;
CREATE POLICY "Distributors see own sales" ON distributor_sales FOR SELECT
    USING (distributor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Distributors manage own sales" ON distributor_sales;
CREATE POLICY "Distributors manage own sales" ON distributor_sales FOR ALL
    USING (distributor_id = auth.uid());

-- 5. Grants
GRANT ALL ON distributor_inventory TO authenticated;
GRANT ALL ON distributor_sales TO authenticated;

-- 6. RPC: Recibir pedido (admin o distribuidor)
CREATE OR REPLACE FUNCTION receive_order(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_is_admin BOOLEAN;
BEGIN
    SELECT (role = 'admin') INTO v_is_admin FROM profiles WHERE id = auth.uid();

    SELECT * INTO v_order FROM orders
    WHERE id = p_order_id AND status = 'shipped'
    AND (distributor_id = auth.uid() OR v_is_admin = true);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado o no está en estado Enviado');
    END IF;

    FOR v_item IN SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
    LOOP
        INSERT INTO distributor_inventory (distributor_id, product_id, stock, updated_at)
        VALUES (v_order.distributor_id, v_item.product_id, v_item.quantity, now())
        ON CONFLICT (distributor_id, product_id)
        DO UPDATE SET stock = distributor_inventory.stock + v_item.quantity, updated_at = now();
    END LOOP;

    UPDATE orders SET status = 'closed', delivered_at = now() WHERE id = p_order_id;
    RETURN jsonb_build_object('success', true, 'message', 'Pedido recibido y stock actualizado');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Registrar venta del distribuidor
CREATE OR REPLACE FUNCTION record_distributor_sale(
    p_product_id UUID, p_quantity INT, p_sale_price NUMERIC,
    p_client_name TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_stock INT;
    v_cost NUMERIC;
BEGIN
    SELECT stock INTO v_stock FROM distributor_inventory
    WHERE distributor_id = auth.uid() AND product_id = p_product_id;
    IF NOT FOUND OR v_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente');
    END IF;
    SELECT price INTO v_cost FROM products WHERE id = p_product_id;
    INSERT INTO distributor_sales (distributor_id, product_id, quantity, sale_price, cost_price, client_name, notes)
    VALUES (auth.uid(), p_product_id, p_quantity, p_sale_price, v_cost, p_client_name, p_notes);
    UPDATE distributor_inventory SET stock = stock - p_quantity, updated_at = now()
    WHERE distributor_id = auth.uid() AND product_id = p_product_id;
    RETURN jsonb_build_object('success', true, 'message', 'Venta registrada');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. HOTFIX: Llenar inventario del pedido que ya se cerró sin inventario
-- Esto busca pedidos cerrados que no tienen inventario y los agrega
DO $$
DECLARE
    v_order RECORD;
    v_item RECORD;
BEGIN
    FOR v_order IN
        SELECT o.id, o.distributor_id FROM orders o
        WHERE o.status = 'closed' AND o.delivered_at IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM distributor_inventory di WHERE di.distributor_id = o.distributor_id
        )
    LOOP
        FOR v_item IN SELECT product_id, quantity FROM order_items WHERE order_id = v_order.id
        LOOP
            INSERT INTO distributor_inventory (distributor_id, product_id, stock, updated_at)
            VALUES (v_order.distributor_id, v_item.product_id, v_item.quantity, now())
            ON CONFLICT (distributor_id, product_id)
            DO UPDATE SET stock = distributor_inventory.stock + v_item.quantity, updated_at = now();
        END LOOP;
    END LOOP;
END;
$$;
