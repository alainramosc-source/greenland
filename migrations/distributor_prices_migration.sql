-- =============================================
-- DISTRIBUTOR CUSTOM PRICES (per distributor + address)
-- =============================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS distributor_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    address_id UUID REFERENCES distributor_addresses(id) ON DELETE CASCADE,
    custom_price DECIMAL(10,2) NOT NULL CHECK (custom_price > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(distributor_id, product_id, address_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dist_prices_lookup 
    ON distributor_prices(distributor_id, address_id);
CREATE INDEX IF NOT EXISTS idx_dist_prices_product 
    ON distributor_prices(product_id);

-- 2. RLS Policies
ALTER TABLE distributor_prices ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins manage distributor prices" ON distributor_prices;
CREATE POLICY "Admins manage distributor prices" ON distributor_prices FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Distributors can see their own prices
DROP POLICY IF EXISTS "Distributors see own prices" ON distributor_prices;
CREATE POLICY "Distributors see own prices" ON distributor_prices FOR SELECT
    USING (distributor_id = auth.uid());

-- 3. Grants
GRANT ALL ON distributor_prices TO authenticated;

-- 4. Handle NULL address_id uniqueness (for default distributor prices without specific address)
-- PostgreSQL treats NULLs as distinct in UNIQUE constraints, so we need a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_dist_prices_default 
    ON distributor_prices(distributor_id, product_id) 
    WHERE address_id IS NULL;
