-- =============================================
-- Cash Control: Caja tracking + received_by
-- Run on Greenland Supabase project
-- =============================================

-- 1. Add "received_by" column to distributor_payments
ALTER TABLE distributor_payments ADD COLUMN IF NOT EXISTS received_by TEXT;

-- 2. Create cash_movements table
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  concept TEXT NOT NULL,
  responsible TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT CHECK (reference_type IN ('distributor_payment', 'retail_sale', 'manual')),
  notes TEXT,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS policies
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on cash_movements"
  ON cash_movements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Index for date range queries
CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON cash_movements (movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements (type);
