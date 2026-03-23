-- ============================================================
-- SUPPLIER PORTAL — Database Schema
-- Covers: Suppliers, Service Orders, Contracts, Invoices
-- ============================================================

-- 1. SUPPLIERS — Catálogo de proveedores nacionales
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Supabase Auth link
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  rfc TEXT,
  address TEXT,
  service_types TEXT[] DEFAULT '{}', -- e.g. {'flete','maniobra','bodega','despacho'}
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SERVICE ORDERS — Órdenes de servicio puntuales
CREATE TABLE IF NOT EXISTS service_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL, -- flete, maniobra, despacho, etc.
  description TEXT,
  scheduled_date DATE,
  location TEXT,
  reference_info TEXT, -- contenedor, pedido, etc.
  agreed_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','aceptada','en_proceso','completada','rechazada','cancelada')),
  rejection_comment TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SERVICE ORDER EVIDENCE — Fotos/docs por OS
CREATE TABLE IF NOT EXISTS service_order_evidence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT, -- image, pdf, document
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SERVICE ORDER INVOICES — Facturas por OS
CREATE TABLE IF NOT EXISTS service_order_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  pdf_url TEXT,
  xml_url TEXT,
  invoiced_amount NUMERIC(12,2) NOT NULL,
  invoice_date DATE,
  validation_status TEXT DEFAULT 'pendiente' CHECK (validation_status IN ('pendiente','aprobada','rechazada')),
  rejection_reason TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. SERVICE ORDER COMMENTS — Hilo de comentarios por OS
CREATE TABLE IF NOT EXISTS service_order_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SERVICE CONTRACTS — Contratos de servicio recurrente
CREATE TABLE IF NOT EXISTS service_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number SERIAL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  description TEXT,
  agreed_amount NUMERIC(12,2) NOT NULL,
  periodicity TEXT DEFAULT 'mensual' CHECK (periodicity IN ('mensual','quincenal','semanal','anual')),
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = indefinido
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CONTRACT CHARGES — Cargos periódicos generados
CREATE TABLE IF NOT EXISTS contract_charges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES service_contracts(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL, -- e.g. 'Marzo 2026', 'Sem 12 2026'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','facturado','aprobado','rechazado')),
  is_extraordinary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CONTRACT CHARGE INVOICES — Facturas por cargo periódico
CREATE TABLE IF NOT EXISTS contract_charge_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  charge_id UUID NOT NULL REFERENCES contract_charges(id) ON DELETE CASCADE,
  pdf_url TEXT,
  xml_url TEXT,
  invoiced_amount NUMERIC(12,2) NOT NULL,
  invoice_date DATE,
  validation_status TEXT DEFAULT 'pendiente' CHECK (validation_status IN ('pendiente','aprobada','rechazada')),
  rejection_reason TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_charge_invoices ENABLE ROW LEVEL SECURITY;

-- Admins can see everything
CREATE POLICY "admin_all_suppliers" ON suppliers FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_all_service_orders" ON service_orders FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_all_so_evidence" ON service_order_evidence FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_all_so_invoices" ON service_order_invoices FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_all_so_comments" ON service_order_comments FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_all_contracts" ON service_contracts FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_all_charges" ON contract_charges FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admin_all_charge_invoices" ON contract_charge_invoices FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Suppliers can see their own data
CREATE POLICY "supplier_own_profile" ON suppliers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "supplier_own_orders" ON service_orders FOR SELECT
  USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

CREATE POLICY "supplier_update_own_orders" ON service_orders FOR UPDATE
  USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

CREATE POLICY "supplier_own_evidence_select" ON service_order_evidence FOR SELECT
  USING (service_order_id IN (
    SELECT so.id FROM service_orders so
    JOIN suppliers s ON s.id = so.supplier_id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "supplier_own_evidence_insert" ON service_order_evidence FOR INSERT
  WITH CHECK (service_order_id IN (
    SELECT so.id FROM service_orders so
    JOIN suppliers s ON s.id = so.supplier_id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "supplier_own_invoices_select" ON service_order_invoices FOR SELECT
  USING (service_order_id IN (
    SELECT so.id FROM service_orders so
    JOIN suppliers s ON s.id = so.supplier_id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "supplier_own_invoices_insert" ON service_order_invoices FOR INSERT
  WITH CHECK (service_order_id IN (
    SELECT so.id FROM service_orders so
    JOIN suppliers s ON s.id = so.supplier_id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "supplier_own_comments_select" ON service_order_comments FOR SELECT
  USING (service_order_id IN (
    SELECT so.id FROM service_orders so
    JOIN suppliers s ON s.id = so.supplier_id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "supplier_own_comments_insert" ON service_order_comments FOR INSERT
  WITH CHECK (service_order_id IN (
    SELECT so.id FROM service_orders so
    JOIN suppliers s ON s.id = so.supplier_id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "supplier_own_contracts" ON service_contracts FOR SELECT
  USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()));

CREATE POLICY "supplier_own_charges" ON contract_charges FOR SELECT
  USING (contract_id IN (
    SELECT sc.id FROM service_contracts sc
    JOIN suppliers s ON s.id = sc.supplier_id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "supplier_own_charge_invoices_select" ON contract_charge_invoices FOR SELECT
  USING (charge_id IN (
    SELECT cc.id FROM contract_charges cc
    JOIN service_contracts sc ON sc.id = cc.contract_id
    JOIN suppliers s ON s.id = sc.supplier_id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "supplier_own_charge_invoices_insert" ON contract_charge_invoices FOR INSERT
  WITH CHECK (charge_id IN (
    SELECT cc.id FROM contract_charges cc
    JOIN service_contracts sc ON sc.id = cc.contract_id
    JOIN suppliers s ON s.id = sc.supplier_id
    WHERE s.user_id = auth.uid()
  ));

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_supplier ON service_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_evidence_order ON service_order_evidence(service_order_id);
CREATE INDEX IF NOT EXISTS idx_so_invoices_order ON service_order_invoices(service_order_id);
CREATE INDEX IF NOT EXISTS idx_so_comments_order ON service_order_comments(service_order_id);
CREATE INDEX IF NOT EXISTS idx_contracts_supplier ON service_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_charges_contract ON contract_charges(contract_id);
CREATE INDEX IF NOT EXISTS idx_charge_invoices_charge ON contract_charge_invoices(charge_id);
