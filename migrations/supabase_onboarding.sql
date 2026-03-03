-- =====================================================
-- MÓDULO: Onboarding y Contratación de Distribuidores
-- =====================================================

-- 1. Perfiles de distribuidor (datos legales)
CREATE TABLE IF NOT EXISTS distributor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  person_type TEXT NOT NULL CHECK (person_type IN ('fisica', 'moral')),
  
  -- Datos comunes
  rfc TEXT,
  tax_regime TEXT,
  email TEXT,
  phone TEXT,
  fiscal_address JSONB DEFAULT '{}',
  -- { street, exterior_num, interior_num, colonia, zip_code, city, state, country }
  
  -- Persona Física
  full_name TEXT,
  curp TEXT,
  
  -- Persona Moral
  legal_name TEXT,
  legal_rep_name TEXT,
  
  -- Estatus del onboarding
  onboarding_status TEXT NOT NULL DEFAULT 'started'
    CHECK (onboarding_status IN ('started', 'docs_uploaded', 'contract_generated', 'contract_signed', 'active')),
  
  -- Declaraciones
  declarations_accepted_at TIMESTAMPTZ,
  declarations_ip TEXT,
  declaration_info_true BOOLEAN DEFAULT FALSE,
  declaration_terms_accepted BOOLEAN DEFAULT FALSE,
  declaration_contract_accepted BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 2. Documentos del distribuidor
CREATE TABLE IF NOT EXISTS distributor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_profile_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  document_type TEXT NOT NULL,
  -- Persona Física: 'identificacion', 'comprobante_domicilio', 'constancia_fiscal'
  -- Persona Moral: 'acta_constitutiva', 'poder_representante', 'identificacion_rep', 'constancia_fiscal', 'comprobante_domicilio'
  
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  upload_ip TEXT
);

-- 3. Contratos
CREATE TABLE IF NOT EXISTS distributor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_profile_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  contract_version INTEGER DEFAULT 1,
  contract_pdf_url TEXT,
  contract_signed_pdf_url TEXT,
  
  -- Firma
  signature_image_url TEXT,
  signed_at TIMESTAMPTZ,
  signer_ip TEXT,
  document_hash TEXT, -- SHA-256 del PDF firmado
  
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generated', 'signed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bitácora de auditoría del onboarding
CREATE TABLE IF NOT EXISTS onboarding_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  distributor_profile_id UUID REFERENCES distributor_profiles(id),
  action TEXT NOT NULL,
  -- Acciones: 'profile_created', 'profile_updated', 'document_uploaded', 'document_approved',
  -- 'document_rejected', 'declarations_accepted', 'contract_generated', 'contract_signed',
  -- 'status_changed'
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_dist_profiles_user ON distributor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_dist_profiles_status ON distributor_profiles(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_dist_docs_profile ON distributor_documents(distributor_profile_id);
CREATE INDEX IF NOT EXISTS idx_dist_contracts_profile ON distributor_contracts(distributor_profile_id);
CREATE INDEX IF NOT EXISTS idx_onb_audit_profile ON onboarding_audit_log(distributor_profile_id);
CREATE INDEX IF NOT EXISTS idx_onb_audit_user ON onboarding_audit_log(user_id);

-- RLS Policies
ALTER TABLE distributor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_audit_log ENABLE ROW LEVEL SECURITY;

-- distributor_profiles: user can see/edit own, admin can see all
CREATE POLICY "Users can view own distributor profile"
  ON distributor_profiles FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can insert own distributor profile"
  ON distributor_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own distributor profile"
  ON distributor_profiles FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- distributor_documents: user can see/upload own, admin can see all + update status
CREATE POLICY "Users can view own documents"
  ON distributor_documents FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can upload own documents"
  ON distributor_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own documents"
  ON distributor_documents FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can delete own documents"
  ON distributor_documents FOR DELETE
  USING (user_id = auth.uid());

-- distributor_contracts: user can see own, admin can see all
CREATE POLICY "Users can view own contracts"
  ON distributor_contracts FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can insert own contracts"
  ON distributor_contracts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contracts"
  ON distributor_contracts FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- onboarding_audit_log: admin can see all, users can see own
CREATE POLICY "Users can view own audit log"
  ON onboarding_audit_log FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can insert audit log"
  ON onboarding_audit_log FOR INSERT
  WITH CHECK (true);

-- Storage bucket (run this in Supabase Dashboard > Storage > Create Bucket)
-- Bucket name: onboarding-docs
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: application/pdf, image/jpeg, image/png

-- Storage RLS (execute after creating bucket):
-- CREATE POLICY "Users can upload own docs" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'onboarding-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can view own docs" ON storage.objects
--   FOR SELECT USING (bucket_id = 'onboarding-docs' AND (auth.uid()::text = (storage.foldername(name))[1] OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')));
