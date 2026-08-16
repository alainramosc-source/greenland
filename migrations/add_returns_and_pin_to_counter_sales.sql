-- =====================================================
-- MIGRACIÓN: Devoluciones en Mostrador, PIN de Autorización y Código de Barras
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar PIN de autorización y Código de Barras en la tabla profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS authorization_pin TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_barcode TEXT;

-- 2. Agregar datos de auditoría de devolución en counter_sales
ALTER TABLE counter_sales ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE counter_sales ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);
ALTER TABLE counter_sales ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE counter_sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 3. Índices para agilizar consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_counter_sales_cancelled_by ON counter_sales(cancelled_by) WHERE cancelled_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_counter_sales_approved_by ON counter_sales(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_authorization_pin ON profiles(authorization_pin) WHERE authorization_pin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_employee_barcode ON profiles(employee_barcode) WHERE employee_barcode IS NOT NULL;
