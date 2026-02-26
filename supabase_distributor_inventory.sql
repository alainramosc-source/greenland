-- ===================================================
-- DISTRIBUTOR MINI INVENTORY SYSTEM
-- Run this in Supabase SQL Editor
-- ===================================================

-- 1. Distributor Inventory: stock per product per distributor
CREATE TABLE IF NOT EXISTS distributor_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(distributor_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_dist_inv_distributor ON distributor_inventory(distributor_id);

-- 2. Distributor Sales: each sale recorded by distributor
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

-- 3. RLS for distributor_inventory
ALTER TABLE distributor_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributors see own inventory"
    ON distributor_inventory FOR SELECT
    USING (distributor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Distributors manage own inventory"
    ON distributor_inventory FOR ALL
    USING (distributor_id = auth.uid());

-- 4. RLS for distributor_sales
ALTER TABLE distributor_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributors see own sales"
    ON distributor_sales FOR SELECT
    USING (distributor_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Distributors manage own sales"
    ON distributor_sales FOR ALL
    USING (distributor_id = auth.uid());

-- 5. Grant access
GRANT ALL ON distributor_inventory TO authenticated;
GRANT ALL ON distributor_sales TO authenticated;

-- 6. RPC: Receive order → adds items to distributor inventory
CREATE OR REPLACE FUNCTION receive_order(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
BEGIN
    -- Verify order exists and belongs to this distributor
    SELECT * INTO v_order FROM orders
    WHERE id = p_order_id AND distributor_id = auth.uid() AND status = 'shipped';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado o no está en estado Enviado');
    END IF;

    -- Add each item to distributor inventory
    FOR v_item IN
        SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
    LOOP
        INSERT INTO distributor_inventory (distributor_id, product_id, stock, updated_at)
        VALUES (auth.uid(), v_item.product_id, v_item.quantity, now())
        ON CONFLICT (distributor_id, product_id)
        DO UPDATE SET
            stock = distributor_inventory.stock + v_item.quantity,
            updated_at = now();
    END LOOP;

    -- Update order status to closed
    UPDATE orders SET status = 'closed', delivered_at = now() WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'message', 'Pedido recibido y stock actualizado');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Record a sale → deducts from distributor inventory
CREATE OR REPLACE FUNCTION record_distributor_sale(
    p_product_id UUID,
    p_quantity INT,
    p_sale_price NUMERIC,
    p_client_name TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_stock INT;
    v_cost NUMERIC;
BEGIN
    -- Get current stock
    SELECT stock INTO v_stock FROM distributor_inventory
    WHERE distributor_id = auth.uid() AND product_id = p_product_id;

    IF NOT FOUND OR v_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente');
    END IF;

    -- Get cost price (current product price)
    SELECT price INTO v_cost FROM products WHERE id = p_product_id;

    -- Record the sale
    INSERT INTO distributor_sales (distributor_id, product_id, quantity, sale_price, cost_price, client_name, notes)
    VALUES (auth.uid(), p_product_id, p_quantity, p_sale_price, v_cost, p_client_name, p_notes);

    -- Deduct from inventory
    UPDATE distributor_inventory
    SET stock = stock - p_quantity, updated_at = now()
    WHERE distributor_id = auth.uid() AND product_id = p_product_id;

    RETURN jsonb_build_object('success', true, 'message', 'Venta registrada');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
