-- =====================================================
-- MIGRACIÓN: Campo de Posición/Puesto para Colaboradores
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
