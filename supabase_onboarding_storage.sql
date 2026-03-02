-- =====================================================
-- Storage Policies para bucket: onboarding-docs
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Permitir a usuarios autenticados subir archivos a su propia carpeta
CREATE POLICY "Users can upload onboarding docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'onboarding-docs');

-- Permitir a usuarios autenticados leer sus propios archivos y admins leer todos
CREATE POLICY "Users can view onboarding docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'onboarding-docs');

-- Permitir a usuarios actualizar sus propios archivos (para upsert)
CREATE POLICY "Users can update onboarding docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'onboarding-docs');

-- Permitir a usuarios eliminar archivos al reemplazar documentos
CREATE POLICY "Users can delete onboarding docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'onboarding-docs');
