-- =====================================================
-- MIGRACIÓN: Funciones RPC para Eliminación Definitiva de Usuarios
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Función para eliminar un solo usuario (Desvincula referencias FK)
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Desvincular de movimientos de caja, ventas y logs para no violar Foreign Keys
  UPDATE cash_movements SET created_by = NULL WHERE created_by = user_id;
  UPDATE counter_sales SET sold_by = NULL WHERE sold_by = user_id;
  UPDATE counter_sales SET cancelled_by = NULL WHERE cancelled_by = user_id;
  UPDATE counter_sales SET approved_by = NULL WHERE approved_by = user_id;
  UPDATE inventory_logs SET user_id = NULL WHERE user_id = user_id;

  -- Eliminar de la tabla de autenticación (libera el email para re-registro)
  DELETE FROM auth.users WHERE id = user_id;
  -- Eliminar de la tabla pública de perfiles
  DELETE FROM public.profiles WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para eliminar múltiples usuarios en lote
CREATE OR REPLACE FUNCTION delete_users(user_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE cash_movements SET created_by = NULL WHERE created_by = ANY(user_ids);
  UPDATE counter_sales SET sold_by = NULL WHERE sold_by = ANY(user_ids);
  UPDATE counter_sales SET cancelled_by = NULL WHERE cancelled_by = ANY(user_ids);
  UPDATE counter_sales SET approved_by = NULL WHERE approved_by = ANY(user_ids);
  UPDATE inventory_logs SET user_id = NULL WHERE user_id = ANY(user_ids);

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
  SELECT id INTO v_user_id FROM public.profiles WHERE email = 'greenland.reciclando@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'greenland.reciclando@gmail.com' LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    -- Desvincular de movimientos de caja y ventas
    UPDATE cash_movements SET created_by = NULL WHERE created_by = v_user_id;
    UPDATE counter_sales SET sold_by = NULL WHERE sold_by = v_user_id;
    UPDATE counter_sales SET cancelled_by = NULL WHERE cancelled_by = v_user_id;
    UPDATE counter_sales SET approved_by = NULL WHERE approved_by = v_user_id;
    UPDATE inventory_logs SET user_id = NULL WHERE user_id = v_user_id;

    -- Borrado definitivo
    DELETE FROM auth.users WHERE id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
  END IF;
END $$;
