-- =====================================================
-- MIGRACIÓN: Funciones RPC para Eliminación Definitiva de Usuarios
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Función para eliminar un solo usuario (Auth + Profiles)
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Elimina de la tabla de autenticación (libera el email para re-registro)
  DELETE FROM auth.users WHERE id = user_id;
  -- Elimina de la tabla pública de perfiles
  DELETE FROM public.profiles WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para eliminar múltiples usuarios en lote
CREATE OR REPLACE FUNCTION delete_users(user_ids UUID[])
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = ANY(user_ids);
  DELETE FROM public.profiles WHERE id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos de ejecución a los roles
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION delete_users(UUID[]) TO authenticated, service_role, anon;

-- =====================================================
-- SCRIPT DE LIMPIEZA INMEDIATA: Francisco Hernandez Prado
-- =====================================================
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar por correo en profiles o auth
  SELECT id INTO v_user_id FROM public.profiles WHERE email = 'greenland.reciclando@gmail.com' LIMIT 1;
  
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'greenland.reciclando@gmail.com' LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
    RAISE NOTICE 'Usuario greenland.reciclando@gmail.com eliminado completamente.';
  END IF;
END $$;
