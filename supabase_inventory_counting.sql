-- =====================================================
-- FASE A: Conteo de Inventario — Schema
-- =====================================================

-- 1. Sesiones de conteo
CREATE TABLE IF NOT EXISTS inventory_count_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_code TEXT NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'submitted', 'approved', 'posted')),
    count_type TEXT NOT NULL DEFAULT 'full' CHECK (count_type IN ('full', 'partial', 'free')),
    freeze_inventory BOOLEAN DEFAULT false,
    responsible_user_id UUID REFERENCES profiles(id),
    supervisor_user_id UUID REFERENCES profiles(id),
    notes TEXT,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES profiles(id),
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id)
);

-- 2. Líneas de conteo (detalle por SKU)
CREATE TABLE IF NOT EXISTS inventory_count_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES inventory_count_sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    sku TEXT,
    qty_system_snapshot INT NOT NULL DEFAULT 0,
    qty_counted INT,
    difference INT GENERATED ALWAYS AS (COALESCE(qty_counted, 0) - qty_system_snapshot) STORED,
    reason TEXT,
    counted_by UUID REFERENCES profiles(id),
    counted_at TIMESTAMPTZ,
    notes TEXT
);

-- 3. Ajustes de inventario (generados al "Posted")
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES inventory_count_sessions(id),
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    qty_before INT NOT NULL,
    qty_after INT NOT NULL,
    adjustment INT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id)
);

-- 4. Bitácora de auditoría (inmutable)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE inventory_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admin full access to counting
CREATE POLICY "Admin access inventory_count_sessions"
ON inventory_count_sessions FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin access inventory_count_lines"
ON inventory_count_lines FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin access inventory_adjustments"
ON inventory_adjustments FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Audit log: anyone authenticated can INSERT, only admin can SELECT
CREATE POLICY "Anyone can insert audit_log"
ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can read audit_log"
ON audit_log FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- NO UPDATE/DELETE policies on audit_log — immutable by design

GRANT ALL ON inventory_count_sessions TO authenticated;
GRANT ALL ON inventory_count_lines TO authenticated;
GRANT ALL ON inventory_adjustments TO authenticated;
GRANT ALL ON audit_log TO authenticated;

-- =====================================================
-- RPC: Generate next session code
-- =====================================================
CREATE OR REPLACE FUNCTION generate_count_session_code()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_seq INT;
BEGIN
    v_year := TO_CHAR(now(), 'YYYY');
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(session_code, '-', 3) AS INT)
    ), 0) + 1
    INTO v_seq
    FROM inventory_count_sessions
    WHERE session_code LIKE 'CNT-' || v_year || '-%';
    
    RETURN 'CNT-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_count_session_code TO authenticated;

-- =====================================================
-- RPC: Create counting session with lines
-- =====================================================
CREATE OR REPLACE FUNCTION create_count_session(
    p_warehouse_id UUID,
    p_count_type TEXT,
    p_responsible_user_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_freeze BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_session_id UUID;
    v_session_code TEXT;
    v_product RECORD;
    v_stock INT;
BEGIN
    -- Verify admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    -- Generate session code
    v_session_code := generate_count_session_code();
    
    -- Create session
    INSERT INTO inventory_count_sessions (
        session_code, warehouse_id, count_type, responsible_user_id, 
        notes, freeze_inventory, created_by, status
    ) VALUES (
        v_session_code, p_warehouse_id, p_count_type, p_responsible_user_id,
        p_notes, p_freeze, auth.uid(), 'draft'
    ) RETURNING id INTO v_session_id;

    -- For 'full' count: generate lines for all products with stock in this warehouse
    IF p_count_type IN ('full', 'partial') THEN
        FOR v_product IN 
            SELECT p.id, p.sku, COALESCE(ws.quantity, 0) as current_stock
            FROM products p
            LEFT JOIN warehouse_stock ws ON ws.product_id = p.id AND ws.warehouse_id = p_warehouse_id
            WHERE p.is_active = true
            ORDER BY p.sku
        LOOP
            INSERT INTO inventory_count_lines (session_id, product_id, sku, qty_system_snapshot)
            VALUES (v_session_id, v_product.id, v_product.sku, v_product.current_stock);
        END LOOP;
    END IF;

    -- Audit log
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'count_created', 'inventory_count', v_session_id,
        jsonb_build_object('session_code', v_session_code, 'warehouse_id', p_warehouse_id, 'count_type', p_count_type));

    RETURN jsonb_build_object('success', true, 'session_id', v_session_id, 'session_code', v_session_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_count_session TO authenticated;
