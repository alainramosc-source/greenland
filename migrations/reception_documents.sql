-- Reception Documents table
CREATE TABLE IF NOT EXISTS reception_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reception_id UUID NOT NULL REFERENCES container_receptions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT, -- e.g. 'invoice', 'bl', 'pedimento', 'debit_note', 'po', 'other'
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reception_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins full access to reception_documents') THEN
    CREATE POLICY "Admins full access to reception_documents" ON reception_documents FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;
END $$;

-- Create storage bucket (run this separately if needed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('reception-docs', 'reception-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: admins can upload/read/delete
CREATE POLICY "Admins manage reception docs" ON storage.objects FOR ALL
  USING (bucket_id = 'reception-docs' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (bucket_id = 'reception-docs' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
