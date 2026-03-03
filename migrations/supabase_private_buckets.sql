-- =====================================================
-- Storage Policies para buckets: payment-receipts y order-evidence
-- Ejecutar en Supabase SQL Editor DESPUÉS de marcarlos como privados
-- =====================================================

-- === payment-receipts ===
CREATE POLICY "Users can upload payment receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "Users can view payment receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-receipts');

CREATE POLICY "Users can update payment receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'payment-receipts');

CREATE POLICY "Users can delete payment receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'payment-receipts');

-- === order-evidence ===
CREATE POLICY "Users can upload order evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'order-evidence');

CREATE POLICY "Users can view order evidence"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'order-evidence');

CREATE POLICY "Users can update order evidence"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'order-evidence');

CREATE POLICY "Users can delete order evidence"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'order-evidence');
