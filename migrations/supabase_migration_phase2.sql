-- ========== FASE 2: Sistema de Evidencias ==========

-- 1. Tabla order_evidence
CREATE TABLE IF NOT EXISTS order_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('embarque', 'guia')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE order_evidence ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins full access evidence" ON order_evidence
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Distributors view own order evidence" ON order_evidence
    FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_evidence.order_id AND orders.distributor_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Storage policies para bucket 'order-evidence'
-- Permitir uploads autenticados
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT 'Allow authenticated uploads', 'order-evidence', 'INSERT',
  '(auth.role() = ''authenticated'')'::text
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'Allow authenticated uploads' AND bucket_id = 'order-evidence'
);

-- Permitir lectura pública
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT 'Allow public read', 'order-evidence', 'SELECT',
  'true'::text
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'Allow public read' AND bucket_id = 'order-evidence'
);

-- Permitir borrado autenticado
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT 'Allow authenticated delete', 'order-evidence', 'DELETE',
  '(auth.role() = ''authenticated'')'::text
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'Allow authenticated delete' AND bucket_id = 'order-evidence'
);

-- ========== FIN FASE 2 SQL ==========
