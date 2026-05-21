-- =============================================
-- PO Legal Compliance — Add fields for 7-element contract
-- =============================================

-- 1. Manufacturer identification fields
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS default_incoterm TEXT DEFAULT 'FOB';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT '30% deposit upon order confirmation, 70% T/T before shipment';

-- 2. Unit price per product-manufacturer mapping
ALTER TABLE supplier_sku_mapping ADD COLUMN IF NOT EXISTS unit_price_usd NUMERIC(10,2);
