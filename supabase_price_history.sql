-- ===================================================
-- PRICE HISTORY TABLE + TRIGGER
-- Run this in Supabase SQL Editor
-- ===================================================

-- 1. Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_price NUMERIC(10,2),
    new_price NUMERIC(10,2) NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, changed_at DESC);

-- 3. Trigger function: auto-log price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        INSERT INTO price_history (product_id, old_price, new_price, changed_by)
        VALUES (NEW.id, OLD.price, NEW.price, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach trigger to products table
DROP TRIGGER IF EXISTS trg_log_price_change ON products;
CREATE TRIGGER trg_log_price_change
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION log_price_change();

-- 5. RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view price history"
    ON price_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 6. Grant access
GRANT SELECT ON price_history TO authenticated;
