-- =====================================================
-- MIGRACIÓN COMPLETA: Funciones RPC para Eliminación Definitiva de Usuarios
-- Solución al error: Column reference "user_id" is ambiguous
-- =====================================================

-- 1. Función para eliminar un solo usuario desvinculando todas las FKs
CREATE OR REPLACE FUNCTION delete_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Desvincular de todas las tablas con Claves Foráneas usando calificación explícita
  UPDATE cash_movements SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE counter_sales SET sold_by = NULL WHERE sold_by = target_user_id;
  UPDATE counter_sales SET cancelled_by = NULL WHERE cancelled_by = target_user_id;
  UPDATE counter_sales SET approved_by = NULL WHERE approved_by = target_user_id;
  UPDATE inventory_logs SET user_id = NULL WHERE inventory_logs.user_id = target_user_id;
  UPDATE order_evidence SET uploaded_by = NULL WHERE uploaded_by = target_user_id;
  UPDATE bank_movements SET uploaded_by = NULL WHERE uploaded_by = target_user_id;
  UPDATE order_payments SET registered_by = NULL WHERE registered_by = target_user_id;

  -- Desvincular/limpiar datos de cliente/distribuidor si aplican
  BEGIN
    DELETE FROM cart WHERE cart.user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    DELETE FROM distributor_pricing WHERE distributor_pricing.user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    DELETE FROM addresses WHERE addresses.user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    UPDATE distributor_documents SET user_id = NULL WHERE distributor_documents.user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    UPDATE distributor_contracts SET user_id = NULL WHERE distributor_contracts.user_id = target_user_id;
    UPDATE distributor_contracts SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Eliminar de la tabla pública de perfiles y autenticación (libera email)
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sobrecarga para mantener compatibilidad con parámetro user_id si se invoca con ese nombre
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM delete_user(target_user_id := user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para eliminar múltiples usuarios en lote
CREATE OR REPLACE FUNCTION delete_users(target_user_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE cash_movements SET created_by = NULL WHERE created_by = ANY(target_user_ids);
  UPDATE counter_sales SET sold_by = NULL WHERE sold_by = ANY(target_user_ids);
  UPDATE counter_sales SET cancelled_by = NULL WHERE cancelled_by = ANY(target_user_ids);
  UPDATE counter_sales SET approved_by = NULL WHERE approved_by = ANY(target_user_ids);
  UPDATE inventory_logs SET user_id = NULL WHERE user_id = ANY(target_user_ids);
  UPDATE order_evidence SET uploaded_by = NULL WHERE uploaded_by = ANY(target_user_ids);
  UPDATE bank_movements SET uploaded_by = NULL WHERE uploaded_by = ANY(target_user_ids);
  UPDATE order_payments SET registered_by = NULL WHERE registered_by = ANY(target_user_ids);

  BEGIN
    DELETE FROM cart WHERE cart.user_id = ANY(target_user_ids);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    DELETE FROM distributor_pricing WHERE distributor_pricing.user_id = ANY(target_user_ids);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    DELETE FROM addresses WHERE addresses.user_id = ANY(target_user_ids);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  DELETE FROM public.profiles WHERE id = ANY(target_user_ids);
  DELETE FROM auth.users WHERE id = ANY(target_user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_users(user_ids UUID[])
RETURNS void AS $$
BEGIN
  PERFORM delete_users(target_user_ids := user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION delete_users(UUID[]) TO authenticated, service_role, anon;
