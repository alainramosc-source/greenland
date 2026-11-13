-- ============================================================================
-- GREENLAND PRODUCTS — AUDITORÍA DE SEGURIDAD Y CONSISTENCIA FINANCIERA
-- FASE 1: EXPAND (100% compatible con las firmas actuales en producción)
-- Rama: security/audit-remediation
-- ============================================================================
-- Cubre:
--   Hallazgo #1: Escalación de privilegios en profiles (role, sub_role, is_active, assigned_warehouse_id)
--   Hallazgo #2: Bóveda de credenciales (staff_credentials) + RPC verify_staff_credential
--   Hallazgo #3: Endurecimiento de RPCs privilegiadas + revocación de permisos a anon/public
--   Hallazgo #5: Doble firma en servidor para salidas de caja (sign_cash_movement_exit + trigger)
--   Hallazgo #7: Unificación de conciliación bancaria (approve_matched_payments -> approve_distributor_payment_atomic)
--   Hallazgo #8: Atomicidad e idempotencia en mostrador (create_counter_sale_atomic, return_counter_sale_atomic)
--   Hallazgo #9: Concurrencia y bloqueo FOR UPDATE en inventarios y reservas (sin doble conteo con trg_sync_product_stock)
--   Hallazgo #11: Creación alineada de add_item_to_order y remove_item_from_order (y cierre de add_order_item)
--   Nota: Las rutas y RPCs del Inbox / Última Milla (create_retail_sale, register_lastmile_prepayment, settle_lastmile_orders, /api/inbox/*) se mantienen sin cambios en esta entrega para revisión independiente.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. FUNCIONES AUXILIARES DE AUTORIZACIÓN INTERNA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND COALESCE(is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_admin_sub_role(p_allowed_sub_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND COALESCE(is_active, true) = true
      AND COALESCE(sub_role, 'super_admin') = ANY(p_allowed_sub_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_authorized_signer_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND role = 'admin'
      AND COALESCE(is_active, true) = true
      AND (
        COALESCE(sub_role, '') IN ('super_admin', 'admin')
        OR LOWER(COALESCE(full_name, '')) LIKE '%alain%'
        OR LOWER(COALESCE(full_name, '')) LIKE '%didier%'
        OR LOWER(COALESCE(email, '')) LIKE '%alain%'
        OR LOWER(COALESCE(email, '')) LIKE '%didier%'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_explicit_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active IS TRUE
      AND sub_role = 'super_admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_admin_sub_role(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_admin_sub_role(TEXT[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_authorized_signer_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_authorized_signer_user(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_explicit_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_explicit_super_admin() TO authenticated;

-- ============================================================================
-- 1. HALLAZGO #1: PROTECCIÓN DE CAMPOS PRIVILEGIADOS EN PROFILES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_super_admin BOOLEAN := FALSE;
BEGIN
  -- Si v_caller_id es NULL, la operación viene de service_role / trigger interno de auth.users
  IF v_caller_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_caller_id
      AND role = 'admin'
      AND COALESCE(is_active, true) = true
      AND COALESCE(sub_role, 'super_admin') IN ('super_admin', 'admin')
  ) INTO v_is_super_admin;

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_super_admin THEN
      IF NEW.id IS DISTINCT FROM v_caller_id THEN
        RAISE EXCEPTION 'No autorizado para crear perfiles de otros usuarios.' USING ERRCODE = '42501';
      END IF;
      NEW.role := 'distributor';
      NEW.sub_role := 'distributor_standard';
      NEW.is_active := false;
      NEW.assigned_warehouse_id := NULL;
      NEW.parent_distributor_id := NULL;
      NEW.authorization_pin := NULL;
      NEW.employee_barcode := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NOT v_is_super_admin THEN
      IF NEW.id IS DISTINCT FROM v_caller_id THEN
        RAISE EXCEPTION 'No autorizado para editar el perfil de otro usuario.' USING ERRCODE = '42501';
      END IF;

      IF NEW.role IS DISTINCT FROM OLD.role
         OR NEW.sub_role IS DISTINCT FROM OLD.sub_role
         OR NEW.is_active IS DISTINCT FROM OLD.is_active
         OR NEW.assigned_warehouse_id IS DISTINCT FROM OLD.assigned_warehouse_id
         OR NEW.parent_distributor_id IS DISTINCT FROM OLD.parent_distributor_id
         OR NEW.client_number IS DISTINCT FROM OLD.client_number
         OR NEW.authorization_pin IS DISTINCT FROM OLD.authorization_pin
         OR NEW.employee_barcode IS DISTINCT FROM OLD.employee_barcode
      THEN
        RAISE EXCEPTION 'No autorizado para modificar rol, estado de activación, bodega o credenciales de autorización.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();

DROP POLICY IF EXISTS "System inserts profiles" ON public.profiles;
CREATE POLICY "System inserts profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR public.has_admin_sub_role(ARRAY['super_admin', 'admin'])
  );

-- ============================================================================
-- 2. HALLAZGO #2: BÓVEDA DE CREDENCIALES (PIN / BARCODE) Y VERIFICACIÓN SERVIDOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_credentials (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  authorization_pin TEXT,
  employee_barcode TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.staff_credentials ENABLE ROW LEVEL SECURITY;

-- Backfill inicial desde profiles
INSERT INTO public.staff_credentials (user_id, authorization_pin, employee_barcode, updated_at)
SELECT
  id,
  NULLIF(btrim(authorization_pin), ''),
  NULLIF(btrim(employee_barcode), ''),
  now()
FROM public.profiles
WHERE NULLIF(btrim(authorization_pin), '') IS NOT NULL
   OR NULLIF(btrim(employee_barcode), '') IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  authorization_pin = COALESCE(EXCLUDED.authorization_pin, public.staff_credentials.authorization_pin),
  employee_barcode = COALESCE(EXCLUDED.employee_barcode, public.staff_credentials.employee_barcode),
  updated_at = now();

-- Trigger de sincronización durante la fase Expand
CREATE OR REPLACE FUNCTION public.sync_profile_credentials_to_vault()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.authorization_pin IS NOT NULL OR NEW.employee_barcode IS NOT NULL THEN
    INSERT INTO public.staff_credentials (user_id, authorization_pin, employee_barcode, updated_at, updated_by)
    VALUES (
      NEW.id,
      NULLIF(btrim(NEW.authorization_pin), ''),
      NULLIF(btrim(NEW.employee_barcode), ''),
      now(),
      auth.uid()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      authorization_pin = CASE
        WHEN NEW.authorization_pin IS NOT NULL AND btrim(NEW.authorization_pin) <> '' THEN btrim(NEW.authorization_pin)
        ELSE public.staff_credentials.authorization_pin
      END,
      employee_barcode = CASE
        WHEN NEW.employee_barcode IS NOT NULL AND btrim(NEW.employee_barcode) <> '' THEN btrim(NEW.employee_barcode)
        ELSE public.staff_credentials.employee_barcode
      END,
      updated_at = now(),
      updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_credentials_to_vault ON public.profiles;
CREATE TRIGGER trg_sync_profile_credentials_to_vault
  AFTER INSERT OR UPDATE OF authorization_pin, employee_barcode ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_credentials_to_vault();

-- RPC para configurar PIN / código de barras sin exponer el PIN
CREATE OR REPLACE FUNCTION public.upsert_staff_credentials(
  p_target_user_id UUID,
  p_pin TEXT DEFAULT NULL,
  p_barcode TEXT DEFAULT NULL,
  p_clear_pin BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin']) THEN
    RAISE EXCEPTION 'Solo Super Admin puede configurar credenciales de personal.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.staff_credentials (user_id, authorization_pin, employee_barcode, updated_at, updated_by)
  VALUES (
    p_target_user_id,
    CASE WHEN p_clear_pin THEN NULL ELSE NULLIF(btrim(p_pin), '') END,
    NULLIF(btrim(p_barcode), ''),
    now(),
    auth.uid()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    authorization_pin = CASE
      WHEN p_clear_pin THEN NULL
      WHEN p_pin IS NOT NULL AND btrim(p_pin) <> '' THEN btrim(p_pin)
      ELSE public.staff_credentials.authorization_pin
    END,
    employee_barcode = CASE
      WHEN p_barcode IS NOT NULL THEN NULLIF(btrim(p_barcode), '')
      ELSE public.staff_credentials.employee_barcode
    END,
    updated_at = now(),
    updated_by = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'has_pin', EXISTS (
      SELECT 1 FROM public.staff_credentials
      WHERE user_id = p_target_user_id AND authorization_pin IS NOT NULL
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_staff_credentials(UUID, TEXT, TEXT, BOOLEAN) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.upsert_staff_credentials(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

-- RPC para consultar metadatos de credenciales (nunca devuelve authorization_pin)
CREATE OR REPLACE FUNCTION public.get_staff_credentials_metadata(p_target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  has_pin BOOLEAN,
  employee_barcode TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin']) THEN
    RAISE EXCEPTION 'No autorizado.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    sc.user_id,
    (sc.authorization_pin IS NOT NULL AND btrim(sc.authorization_pin) <> '') AS has_pin,
    sc.employee_barcode
  FROM public.staff_credentials sc
  WHERE p_target_user_id IS NULL OR sc.user_id = p_target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_staff_credentials_metadata(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_staff_credentials_metadata(UUID) TO authenticated;

-- RPC central para verificar PIN o Código de Barras en servidor (nunca devuelve el PIN)
CREATE OR REPLACE FUNCTION public.verify_staff_credential(
  p_code TEXT,
  p_purpose TEXT DEFAULT 'identify'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_code TEXT := btrim(COALESCE(p_code, ''));
  v_matched RECORD;
BEGIN
  IF NOT public.is_active_admin() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Sesión no autorizada para verificar credenciales.');
  END IF;

  IF v_clean_code = '' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Ingresa o escanea un PIN o código de empleado.');
  END IF;

  SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.sub_role,
    p.job_title
  INTO v_matched
  FROM public.profiles p
  LEFT JOIN public.staff_credentials sc ON sc.user_id = p.id
  WHERE p.role = 'admin'
    AND COALESCE(p.is_active, true) = true
    AND (
      COALESCE(sc.authorization_pin, p.authorization_pin) = v_clean_code
      OR COALESCE(sc.employee_barcode, p.employee_barcode) = v_clean_code
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'PIN o Código de Barras no reconocido o colaborador inactivo.');
  END IF;

  IF p_purpose IN ('counter_return', 'cash_exit_sign') THEN
    IF NOT public.is_authorized_signer_user(v_matched.id) THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'La credencial pertenece a ' || COALESCE(v_matched.full_name, v_matched.email) || ', quien no tiene facultades de firma para autorizar esta operación.'
      );
    END IF;
  ELSIF p_purpose IN ('counter_sale', 'recycling_buy') THEN
    IF COALESCE(v_matched.sub_role, 'super_admin') NOT IN ('super_admin', 'admin', 'warehouse_admin') THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'El colaborador con rol de solo lectura o contabilidad no puede operar transacciones de mostrador o reciclaje.'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'user_id', v_matched.id,
    'full_name', COALESCE(v_matched.full_name, v_matched.email),
    'role', v_matched.role,
    'sub_role', v_matched.sub_role,
    'job_title', v_matched.job_title
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_staff_credential(TEXT, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.verify_staff_credential(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 3. HALLAZGO #3 Y #9: ENDURECIMIENTO DE RPCs PRIVILEGIADAS Y CONCURRENCIA
-- ============================================================================

-- 3.1 adjust_warehouse_stock_atomic (RPC atómica interna que devuelve JSONB para Mostrador, con bloqueo FOR UPDATE, rechazo de stock negativo y autorización explícita por rol; adjust_warehouse_stock, Recepciones e Inbox / Última Milla se conservan sin cambios para sus entregas respectivas)
CREATE OR REPLACE FUNCTION public.adjust_warehouse_stock_atomic(
  p_product_id UUID,
  p_warehouse_id UUID,
  p_quantity_change INTEGER,
  p_reason TEXT DEFAULT 'Manual adjustment'::TEXT,
  p_created_by UUID DEFAULT NULL::UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_user_id UUID;
  v_sku TEXT;
  v_wh_name TEXT;
  v_old_stock INT;
  v_new_stock INT;
BEGIN
  IF v_caller_id IS NULL OR NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para ajustar existencias de bodega.');
  END IF;

  IF current_setting('app.trusted_stock_caller', true) = 'true' AND p_created_by IS NOT NULL THEN
    v_user_id := p_created_by;
  ELSE
    v_user_id := v_caller_id;
  END IF;

  INSERT INTO public.warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
  VALUES (p_warehouse_id, p_product_id, 0, 0)
  ON CONFLICT (warehouse_id, product_id) DO NOTHING;

  -- Lectura con bloqueo FOR UPDATE para evitar condiciones de carrera (Hallazgo #9)
  SELECT COALESCE(stock_quantity, 0)
  INTO v_old_stock
  FROM public.warehouse_stock
  WHERE warehouse_id = p_warehouse_id
    AND product_id = p_product_id
  FOR UPDATE;

  IF (v_old_stock + p_quantity_change) < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Stock insuficiente en bodega (actual: %s, cambio solicitado: %s).', v_old_stock, p_quantity_change)
    );
  END IF;

  v_new_stock := v_old_stock + p_quantity_change;

  UPDATE public.warehouse_stock
  SET stock_quantity = v_new_stock,
      updated_at = now()
  WHERE warehouse_id = p_warehouse_id
    AND product_id = p_product_id;

  SELECT sku INTO v_sku FROM public.products WHERE id = p_product_id;
  SELECT name INTO v_wh_name FROM public.warehouses WHERE id = p_warehouse_id;

  INSERT INTO public.inventory_logs (user_id, product_id, quantity_change, reason)
  VALUES (
    v_user_id,
    p_product_id,
    p_quantity_change,
    p_reason || ' [Bodega: ' || COALESCE(v_wh_name, 'Desconocida') || ']'
  );

  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    CASE WHEN p_quantity_change >= 0 THEN 'stock_increase' ELSE 'stock_decrease' END,
    'warehouse_stock',
    p_product_id,
    jsonb_build_object(
      'sku', COALESCE(v_sku, ''),
      'warehouse', COALESCE(v_wh_name, ''),
      'before', v_old_stock,
      'after', v_new_stock,
      'change', p_quantity_change,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'before', v_old_stock,
    'after', v_new_stock
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_warehouse_stock_atomic(UUID, UUID, INTEGER, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_warehouse_stock_atomic(UUID, UUID, INTEGER, TEXT, UUID) TO authenticated;

-- 3.2 transfer_stock (mantiene firma exacta de producción + validación de rol/bodega + bloqueo FOR UPDATE)
CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_product_id UUID,
  p_from_warehouse_id UUID,
  p_to_warehouse_id UUID,
  p_quantity INT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_profile RECORD;
  v_available INT;
  v_from_name TEXT;
  v_to_name TEXT;
  v_sku TEXT;
  v_product_name TEXT;
  v_stock_before_from INT;
  v_stock_before_to INT;
  v_uid UUID;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado.');
  END IF;

  SELECT id, role, sub_role, is_active, assigned_warehouse_id
  INTO v_caller_profile
  FROM public.profiles
  WHERE id = v_caller_id;

  IF NOT FOUND OR NOT COALESCE(v_caller_profile.is_active, true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil inactivo o inexistente.');
  END IF;

  IF v_caller_profile.role = 'admin' THEN
    IF COALESCE(v_caller_profile.sub_role, 'super_admin') NOT IN ('super_admin', 'admin', 'warehouse_admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Tu sub-rol administrativo no permite transferir inventario.');
    END IF;
  ELSIF v_caller_profile.role = 'distributor' AND v_caller_profile.sub_role = 'distributor_pro' THEN
    IF v_caller_profile.assigned_warehouse_id IS DISTINCT FROM p_from_warehouse_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Solo puedes transferir inventario desde tu almacén asignado.');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para transferir inventario entre bodegas.');
  END IF;

  IF p_from_warehouse_id = p_to_warehouse_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Las bodegas de origen y destino deben ser diferentes.');
  END IF;

  IF COALESCE(p_quantity, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La cantidad debe ser mayor a 0.');
  END IF;

  v_uid := v_caller_id;

  SELECT name INTO v_from_name FROM public.warehouses WHERE id = p_from_warehouse_id;
  SELECT name INTO v_to_name FROM public.warehouses WHERE id = p_to_warehouse_id;
  SELECT sku, name INTO v_sku, v_product_name FROM public.products WHERE id = p_product_id;

  INSERT INTO public.warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
  VALUES
    (p_from_warehouse_id, p_product_id, 0, 0),
    (p_to_warehouse_id, p_product_id, 0, 0)
  ON CONFLICT (warehouse_id, product_id) DO NOTHING;

  -- Bloquear ambas filas en orden determinístico para evitar deadlocks
  PERFORM 1
  FROM public.warehouse_stock
  WHERE product_id = p_product_id
    AND warehouse_id IN (p_from_warehouse_id, p_to_warehouse_id)
  ORDER BY warehouse_id
  FOR UPDATE;

  SELECT stock_quantity, (stock_quantity - COALESCE(reserved_quantity, 0))
  INTO v_stock_before_from, v_available
  FROM public.warehouse_stock
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente en bodega origen. Disponible: ' || COALESCE(v_available, 0));
  END IF;

  SELECT COALESCE(stock_quantity, 0)
  INTO v_stock_before_to
  FROM public.warehouse_stock
  WHERE warehouse_id = p_to_warehouse_id AND product_id = p_product_id;

  UPDATE public.warehouse_stock
  SET stock_quantity = stock_quantity - p_quantity, updated_at = now()
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;

  UPDATE public.warehouse_stock
  SET stock_quantity = stock_quantity + p_quantity, updated_at = now()
  WHERE warehouse_id = p_to_warehouse_id AND product_id = p_product_id;

  INSERT INTO public.inventory_logs (user_id, product_id, quantity_change, reason)
  VALUES (
    v_uid, p_product_id, -p_quantity,
    'Transferencia a ' || COALESCE(v_to_name, '') || ' [Bodega: ' || COALESCE(v_from_name, '') || ']'
  );

  INSERT INTO public.inventory_logs (user_id, product_id, quantity_change, reason)
  VALUES (
    v_uid, p_product_id, p_quantity,
    'Transferencia desde ' || COALESCE(v_from_name, '') || ' [Bodega: ' || COALESCE(v_to_name, '') || ']'
  );

  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_uid, 'stock_transfer', 'product', p_product_id,
    jsonb_build_object(
      'sku', v_sku,
      'product', v_product_name,
      'from_warehouse', v_from_name,
      'to_warehouse', v_to_name,
      'quantity', p_quantity,
      'from_before', COALESCE(v_stock_before_from, 0),
      'from_after', COALESCE(v_stock_before_from, 0) - p_quantity,
      'to_before', v_stock_before_to,
      'to_after', v_stock_before_to + p_quantity
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transfer_stock(UUID, UUID, UUID, INT, UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.transfer_stock(UUID, UUID, UUID, INT, UUID) TO authenticated;

-- 3.3 confirm_order (valida rol admin o distributor_pro padre, bloquea pedido y stock FOR UPDATE, valida disponibilidad y evita doble conteo con trg_sync_product_stock)
CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_item RECORD;
  v_wh_id UUID;
  v_wh_stock RECORD;
  v_has_sync_trigger BOOLEAN;
  v_is_authorized_pro BOOLEAN := FALSE;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p_pro
      JOIN public.profiles p_sub ON p_sub.parent_distributor_id = p_pro.id
      WHERE p_pro.id = v_caller_id
        AND p_pro.role = 'distributor'
        AND p_pro.sub_role = 'distributor_pro'
        AND COALESCE(p_pro.is_active, true) = true
        AND p_sub.id = v_order.distributor_id
    ) INTO v_is_authorized_pro;

    IF NOT v_is_authorized_pro THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para confirmar pedidos.');
    END IF;
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden confirmar pedidos en estado Pendiente');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_product_stock'
      AND NOT tgisinternal
  ) INTO v_has_sync_trigger;

  -- 1. Validar disponibilidad con bloqueo FOR UPDATE antes de reservar
  FOR v_item IN
    SELECT oi.*, p.name AS product_name, p.sku
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    ORDER BY oi.product_id
  LOOP
    v_wh_id := COALESCE(v_item.warehouse_id, v_order.warehouse_id);

    IF v_wh_id IS NOT NULL THEN
      SELECT stock_quantity, reserved_quantity
      INTO v_wh_stock
      FROM public.warehouse_stock
      WHERE warehouse_id = v_wh_id AND product_id = v_item.product_id
      FOR UPDATE;

      IF NOT FOUND OR (COALESCE(v_wh_stock.stock_quantity, 0) - COALESCE(v_wh_stock.reserved_quantity, 0)) < v_item.quantity THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Stock disponible insuficiente en bodega para %s (%s). Disponible: %s, solicitado: %s.',
            v_item.sku, v_item.product_name,
            GREATEST(0, COALESCE(v_wh_stock.stock_quantity, 0) - COALESCE(v_wh_stock.reserved_quantity, 0)),
            v_item.quantity
          )
        );
      END IF;
    ELSE
      SELECT stock_quantity, reserved_quantity
      INTO v_wh_stock
      FROM public.products
      WHERE id = v_item.product_id
      FOR UPDATE;

      IF (COALESCE(v_wh_stock.stock_quantity, 0) - COALESCE(v_wh_stock.reserved_quantity, 0)) < v_item.quantity THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Stock global insuficiente para %s (%s). Disponible: %s, solicitado: %s.',
            v_item.sku, v_item.product_name,
            GREATEST(0, COALESCE(v_wh_stock.stock_quantity, 0) - COALESCE(v_wh_stock.reserved_quantity, 0)),
            v_item.quantity
          )
        );
      END IF;
    END IF;
  END LOOP;

  -- Recalcular total basado en items actuales
  UPDATE public.orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM public.order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  -- 2. Reservar inventario sin doble conteo
  FOR v_item IN
    SELECT * FROM public.order_items WHERE order_id = p_order_id
  LOOP
    v_wh_id := COALESCE(v_item.warehouse_id, v_order.warehouse_id);

    IF v_wh_id IS NOT NULL THEN
      UPDATE public.warehouse_stock
      SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_item.quantity,
          updated_at = now()
      WHERE warehouse_id = v_wh_id AND product_id = v_item.product_id;

      IF NOT v_has_sync_trigger THEN
        UPDATE public.products
        SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_item.quantity
        WHERE id = v_item.product_id;
      END IF;
    ELSE
      UPDATE public.products
      SET reserved_quantity = COALESCE(reserved_quantity, 0) + v_item.quantity
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE public.orders
  SET status = 'confirmed',
      confirmed_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_order(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.confirm_order(UUID) TO authenticated;

-- 3.4 assign_item_warehouse (valida rol admin, bloquea FOR UPDATE y evita doble conteo con trg_sync_product_stock)
CREATE OR REPLACE FUNCTION public.assign_item_warehouse(
  p_item_id UUID,
  p_warehouse_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_item RECORD;
  v_old_wh UUID;
BEGIN
  IF v_caller_id IS NULL OR NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para reasignar bodega.');
  END IF;

  SELECT oi.product_id, oi.quantity, oi.warehouse_id, o.status
  INTO v_item
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = p_item_id
  FOR UPDATE OF oi;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item no encontrado');
  END IF;

  v_old_wh := v_item.warehouse_id;

  UPDATE public.order_items SET warehouse_id = p_warehouse_id WHERE id = p_item_id;

  IF v_item.status IN ('confirmed', 'in_fulfillment')
     AND p_warehouse_id IS NOT NULL
     AND v_old_wh IS DISTINCT FROM p_warehouse_id
  THEN
    IF v_old_wh IS NOT NULL THEN
      UPDATE public.warehouse_stock
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
          updated_at = now()
      WHERE warehouse_id = v_old_wh AND product_id = v_item.product_id;
    END IF;

    INSERT INTO public.warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
    VALUES (p_warehouse_id, v_item.product_id, 0, v_item.quantity)
    ON CONFLICT (warehouse_id, product_id) DO UPDATE
    SET reserved_quantity = COALESCE(public.warehouse_stock.reserved_quantity, 0) + v_item.quantity,
        updated_at = now();
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_item_warehouse(UUID, UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.assign_item_warehouse(UUID, UUID) TO authenticated;

-- 3.5 cancel_order (mantiene firma de producción, valida admin o dueño en pending, bloquea FOR UPDATE y evita doble conteo)
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Cancelado por administrador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_item RECORD;
  v_wh_id UUID;
  v_is_admin BOOLEAN;
  v_has_sync_trigger BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  v_is_admin := public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']);

  IF NOT v_is_admin THEN
    IF v_order.distributor_id IS DISTINCT FROM v_caller_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para cancelar este pedido.');
    END IF;
    IF v_order.status != 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Solo puedes cancelar pedidos que aún estén en estado Pendiente.');
    END IF;
  END IF;

  IF v_order.status NOT IN ('pending', 'confirmed', 'in_fulfillment') THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Solo se pueden cancelar pedidos en estado Pendiente, Confirmado o En Surtido.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_product_stock'
      AND NOT tgisinternal
  ) INTO v_has_sync_trigger;

  IF v_order.status IN ('confirmed', 'in_fulfillment') THEN
    FOR v_item IN
      SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
      v_wh_id := COALESCE(v_item.warehouse_id, v_order.warehouse_id);

      IF v_wh_id IS NOT NULL THEN
        UPDATE public.warehouse_stock
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
            updated_at = now()
        WHERE warehouse_id = v_wh_id
          AND product_id = v_item.product_id;

        IF NOT v_has_sync_trigger THEN
          UPDATE public.products
          SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
          WHERE id = v_item.product_id;
        END IF;
      ELSE
        UPDATE public.products
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      rejection_reason = p_reason,
      notes = COALESCE(notes, '') || E'\n\n❌ CANCELADO: ' || p_reason || ' — ' || to_char(now(), 'DD/Mon/YYYY HH24:MI')
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'message', 'Pedido cancelado. Inventario liberado. Los pagos registrados se mantienen.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) TO authenticated;

-- 3.6 update_order_status (mantiene firma exacta de producción, valida admin o distributor_pro padre, delega confirmed a confirm_order, bloquea FOR UPDATE y evita doble conteo)
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_item RECORD;
  v_wh_id UUID;
  v_has_sync_trigger BOOLEAN;
  v_is_authorized_pro BOOLEAN := FALSE;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p_pro
      JOIN public.profiles p_sub ON p_sub.parent_distributor_id = p_pro.id
      WHERE p_pro.id = v_caller_id
        AND p_pro.role = 'distributor'
        AND p_pro.sub_role = 'distributor_pro'
        AND COALESCE(p_pro.is_active, true) = true
        AND p_sub.id = v_order.distributor_id
    ) INTO v_is_authorized_pro;

    IF NOT v_is_authorized_pro THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para actualizar el estado operativo del pedido.');
    END IF;
  END IF;

  IF p_new_status = 'confirmed' AND v_order.status = 'pending' THEN
    RETURN public.confirm_order(p_order_id);
  END IF;

  IF p_new_status = 'in_fulfillment' AND v_order.status != 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo pedidos confirmados pueden pasar a surtido');
  END IF;

  IF p_new_status = 'shipped' AND v_order.status != 'in_fulfillment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo pedidos en surtido pueden marcarse como enviados');
  END IF;

  IF p_new_status = 'closed' AND v_order.status != 'shipped' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo pedidos enviados pueden cerrarse');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_product_stock'
      AND NOT tgisinternal
  ) INTO v_has_sync_trigger;

  -- SHIPPED: liberar reserva y descontar stock sin doble conteo
  IF p_new_status = 'shipped' AND v_order.status = 'in_fulfillment' THEN
    FOR v_item IN
      SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
      v_wh_id := COALESCE(v_item.warehouse_id, v_order.warehouse_id);

      IF v_wh_id IS NOT NULL THEN
        UPDATE public.warehouse_stock
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
            stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_item.quantity),
            updated_at = now()
        WHERE product_id = v_item.product_id
          AND warehouse_id = v_wh_id;

        IF NOT v_has_sync_trigger THEN
          UPDATE public.products
          SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
              stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_item.quantity)
          WHERE id = v_item.product_id;
        END IF;
      ELSE
        UPDATE public.products
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
            stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_item.quantity)
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;
  END IF;

  -- CANCELLED/REJECTED: liberar reserva únicamente
  IF p_new_status IN ('cancelled', 'rejected') AND v_order.status IN ('confirmed', 'in_fulfillment') THEN
    FOR v_item IN
      SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
      v_wh_id := COALESCE(v_item.warehouse_id, v_order.warehouse_id);

      IF v_wh_id IS NOT NULL THEN
        UPDATE public.warehouse_stock
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity),
            updated_at = now()
        WHERE product_id = v_item.product_id
          AND warehouse_id = v_wh_id;

        IF NOT v_has_sync_trigger THEN
          UPDATE public.products
          SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
          WHERE id = v_item.product_id;
        END IF;
      ELSE
        UPDATE public.products
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - v_item.quantity)
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders SET status = p_new_status WHERE id = p_order_id;

  IF p_new_status = 'shipped' THEN
    UPDATE public.orders SET shipped_at = NOW() WHERE id = p_order_id;
  END IF;

  IF p_new_status = 'closed' THEN
    UPDATE public.orders SET delivered_at = NOW() WHERE id = p_order_id;
  END IF;

  IF p_new_status = 'rejected' AND p_rejection_reason IS NOT NULL THEN
    UPDATE public.orders SET rejection_reason = p_rejection_reason WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, TEXT) TO authenticated;

-- 3.7 register_payment (mantiene firma exacta de producción, restringido a super_admin / admin)
CREATE OR REPLACE FUNCTION public.register_payment(
  p_order_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_reference TEXT,
  p_payment_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_total_paid NUMERIC;
BEGIN
  IF v_caller_id IS NULL OR NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo un Super Admin activo puede registrar pagos.');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  IF COALESCE(p_amount, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El monto debe ser mayor a 0');
  END IF;

  INSERT INTO public.order_payments (order_id, amount, payment_method, reference, payment_date, notes, registered_by)
  VALUES (p_order_id, ROUND(p_amount, 2), p_payment_method, p_reference, COALESCE(p_payment_date, CURRENT_DATE), p_notes, v_caller_id);

  SELECT ROUND(COALESCE(SUM(amount), 0), 2) INTO v_total_paid
  FROM public.order_payments
  WHERE order_id = p_order_id;

  IF v_total_paid >= ROUND(v_order.total_amount, 2) - 0.01 THEN
    UPDATE public.orders SET payment_status = 'paid' WHERE id = p_order_id;
  ELSIF v_total_paid > 0 THEN
    UPDATE public.orders SET payment_status = 'partial' WHERE id = p_order_id;
  ELSE
    UPDATE public.orders SET payment_status = 'unpaid' WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'total_paid', v_total_paid);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_payment(UUID, NUMERIC, TEXT, TEXT, DATE, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.register_payment(UUID, NUMERIC, TEXT, TEXT, DATE, TEXT) TO authenticated;

-- 3.8 update_order_item_quantity, add_item_to_order y remove_item_from_order (con validación de autorización y sin doble conteo)
CREATE OR REPLACE FUNCTION public.update_order_item_quantity(
  p_order_id UUID,
  p_item_id UUID,
  p_new_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_item RECORD;
  v_diff INTEGER;
  v_wh_id UUID;
  v_is_admin BOOLEAN;
  v_has_sync_trigger BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  v_is_admin := public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']);
  IF NOT v_is_admin THEN
    IF v_order.distributor_id IS DISTINCT FROM v_caller_id OR v_order.status != 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para modificar este pedido.');
    END IF;
  END IF;

  IF v_order.status IN ('cancelled', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se puede editar un pedido cancelado o rechazado');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_product_stock'
      AND NOT tgisinternal
  ) INTO v_has_sync_trigger;

  SELECT * INTO v_item FROM public.order_items WHERE id = p_item_id AND order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item no encontrado');
  END IF;

  v_wh_id := COALESCE(v_item.warehouse_id, v_order.warehouse_id);

  IF p_new_quantity <= 0 THEN
    v_diff := -v_item.quantity;
    IF v_order.status IN ('shipped', 'closed') THEN
      IF v_wh_id IS NOT NULL THEN
        UPDATE public.warehouse_stock SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;
        IF NOT v_has_sync_trigger THEN
          UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff WHERE id = v_item.product_id;
        END IF;
      ELSE
        UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff WHERE id = v_item.product_id;
      END IF;
    ELSIF v_order.status IN ('confirmed', 'in_fulfillment') THEN
      IF v_wh_id IS NOT NULL THEN
        UPDATE public.warehouse_stock SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff) WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;
        IF NOT v_has_sync_trigger THEN
          UPDATE public.products SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff) WHERE id = v_item.product_id;
        END IF;
      ELSE
        UPDATE public.products SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff) WHERE id = v_item.product_id;
      END IF;
    END IF;

    DELETE FROM public.order_items WHERE id = p_item_id AND order_id = p_order_id;
  ELSE
    v_diff := p_new_quantity - v_item.quantity;
    IF v_diff != 0 THEN
      IF v_order.status IN ('shipped', 'closed') THEN
        IF v_wh_id IS NOT NULL THEN
          UPDATE public.warehouse_stock SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff) WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;
          IF NOT v_has_sync_trigger THEN
            UPDATE public.products SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff) WHERE id = v_item.product_id;
          END IF;
        ELSE
          UPDATE public.products SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff) WHERE id = v_item.product_id;
        END IF;
      ELSIF v_order.status IN ('confirmed', 'in_fulfillment') THEN
        IF v_wh_id IS NOT NULL THEN
          UPDATE public.warehouse_stock SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff) WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;
          IF NOT v_has_sync_trigger THEN
            UPDATE public.products SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff) WHERE id = v_item.product_id;
          END IF;
        ELSE
          UPDATE public.products SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff) WHERE id = v_item.product_id;
        END IF;
      END IF;
    END IF;

    UPDATE public.order_items
    SET quantity = p_new_quantity
    WHERE id = p_item_id AND order_id = p_order_id;
  END IF;

  UPDATE public.orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM public.order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_order_item_quantity(UUID, UUID, INTEGER) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_order_item_quantity(UUID, UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_item_to_order(
  p_order_id UUID,
  p_product_id UUID,
  p_quantity INT DEFAULT 1,
  p_unit_price NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_unit_price NUMERIC;
  v_is_admin BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  v_is_admin := public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']);
  IF NOT v_is_admin AND (v_order.distributor_id IS DISTINCT FROM v_caller_id OR v_order.status != 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para agregar productos a este pedido.');
  END IF;

  IF v_order.status IN ('cancelled', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se puede modificar un pedido cancelado o rechazado.');
  END IF;

  IF COALESCE(p_quantity, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La cantidad debe ser mayor a 0.');
  END IF;

  IF COALESCE(p_unit_price, 0) <= 0 OR NOT v_is_admin THEN
    SELECT price INTO v_unit_price FROM public.products WHERE id = p_product_id;
    IF v_unit_price IS NULL THEN v_unit_price := 0; END IF;
  ELSE
    v_unit_price := p_unit_price;
  END IF;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
  VALUES (p_order_id, p_product_id, p_quantity, v_unit_price);

  UPDATE public.orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM public.order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_item_to_order(UUID, UUID, INT, NUMERIC) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.add_item_to_order(UUID, UUID, INT, NUMERIC) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_item_from_order(
  p_order_id UUID,
  p_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_is_admin BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  v_is_admin := public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']);
  IF NOT v_is_admin AND (v_order.distributor_id IS DISTINCT FROM v_caller_id OR v_order.status != 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para eliminar partidas de este pedido.');
  END IF;

  DELETE FROM public.order_items WHERE id = p_item_id AND order_id = p_order_id;

  UPDATE public.orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0) FROM public.order_items WHERE order_id = p_order_id
  )
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_item_from_order(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_item_from_order(UUID, UUID) TO authenticated;

-- 3.8b Cerrar y retirar las RPCs legadas sin consumidores (add_order_item / remove_order_item)
-- Confirmado en código: ningún archivo en src/ invoca add_order_item ni remove_order_item;
-- todo el portal utiliza add_item_to_order y remove_item_from_order.
DO $$
DECLARE
  v_fn RECORD;
BEGIN
  FOR v_fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('add_order_item', 'remove_order_item')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', v_fn.proname, v_fn.args);
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s)', v_fn.proname, v_fn.args);
  END LOOP;
END $$;

-- 3.9 delete_user y delete_users (restringidos estrictamente a super_admin, compatibles con user_id/target_user_id y revocados de anon/public)
DROP FUNCTION IF EXISTS public.delete_user(UUID);
DROP FUNCTION IF EXISTS public.delete_user(UUID, UUID);
CREATE OR REPLACE FUNCTION public.delete_user(
  user_id UUID DEFAULT NULL,
  target_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id UUID := COALESCE(target_user_id, user_id);
BEGIN
  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin']) THEN
    RAISE EXCEPTION 'Solo Super Admin puede eliminar usuarios.' USING ERRCODE = '42501';
  END IF;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere el ID del usuario a eliminar.' USING ERRCODE = '22023';
  END IF;

  IF v_target_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta activa.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.cash_movements SET created_by = NULL WHERE created_by = v_target_id;
  UPDATE public.counter_sales SET sold_by = NULL WHERE sold_by = v_target_id;
  UPDATE public.counter_sales SET cancelled_by = NULL WHERE cancelled_by = v_target_id;
  UPDATE public.counter_sales SET approved_by = NULL WHERE approved_by = v_target_id;
  UPDATE public.inventory_logs SET user_id = NULL WHERE inventory_logs.user_id = v_target_id;
  UPDATE public.order_evidence SET uploaded_by = NULL WHERE uploaded_by = v_target_id;
  UPDATE public.bank_movements SET uploaded_by = NULL WHERE uploaded_by = v_target_id;
  UPDATE public.order_payments SET registered_by = NULL WHERE registered_by = v_target_id;

  BEGIN DELETE FROM public.cart WHERE cart.user_id = v_target_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.distributor_pricing WHERE distributor_pricing.user_id = v_target_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.addresses WHERE addresses.user_id = v_target_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE public.distributor_documents SET user_id = NULL WHERE distributor_documents.user_id = v_target_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    UPDATE public.distributor_contracts SET user_id = NULL WHERE distributor_contracts.user_id = v_target_id;
    UPDATE public.distributor_contracts SET reviewed_by = NULL WHERE reviewed_by = v_target_id;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  DELETE FROM public.profiles WHERE id = v_target_id;
  DELETE FROM auth.users WHERE id = v_target_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user(UUID, UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_user(UUID, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.delete_users(UUID[]);
DROP FUNCTION IF EXISTS public.delete_users(UUID[], UUID[]);
CREATE OR REPLACE FUNCTION public.delete_users(
  user_ids UUID[] DEFAULT NULL,
  target_user_ids UUID[] DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_ids UUID[] := COALESCE(target_user_ids, user_ids);
BEGIN
  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin']) THEN
    RAISE EXCEPTION 'Solo Super Admin puede eliminar usuarios masivamente.' USING ERRCODE = '42501';
  END IF;

  IF v_target_ids IS NULL OR COALESCE(array_length(v_target_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  IF auth.uid() = ANY(v_target_ids) THEN
    RAISE EXCEPTION 'No puedes incluir tu propia cuenta en la eliminación masiva.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.cash_movements SET created_by = NULL WHERE created_by = ANY(v_target_ids);
  UPDATE public.counter_sales SET sold_by = NULL WHERE sold_by = ANY(v_target_ids);
  UPDATE public.counter_sales SET cancelled_by = NULL WHERE cancelled_by = ANY(v_target_ids);
  UPDATE public.counter_sales SET approved_by = NULL WHERE approved_by = ANY(v_target_ids);
  UPDATE public.inventory_logs SET user_id = NULL WHERE inventory_logs.user_id = ANY(v_target_ids);
  UPDATE public.order_evidence SET uploaded_by = NULL WHERE uploaded_by = ANY(v_target_ids);
  UPDATE public.bank_movements SET uploaded_by = NULL WHERE uploaded_by = ANY(v_target_ids);
  UPDATE public.order_payments SET registered_by = NULL WHERE registered_by = ANY(v_target_ids);

  BEGIN DELETE FROM public.cart WHERE cart.user_id = ANY(v_target_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.distributor_pricing WHERE distributor_pricing.user_id = ANY(v_target_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.addresses WHERE addresses.user_id = ANY(v_target_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE public.distributor_documents SET user_id = NULL WHERE distributor_documents.user_id = ANY(v_target_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    UPDATE public.distributor_contracts SET user_id = NULL WHERE distributor_contracts.user_id = ANY(v_target_ids);
    UPDATE public.distributor_contracts SET reviewed_by = NULL WHERE reviewed_by = ANY(v_target_ids);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  DELETE FROM public.profiles WHERE id = ANY(v_target_ids);
  DELETE FROM auth.users WHERE id = ANY(v_target_ids);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_users(UUID[], UUID[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_users(UUID[], UUID[]) TO authenticated;

-- 3.10 update_user_sub_role, update_order_payment_status, approve_distributor_payment_atomic, review_distributor_payment y get_user_email
DROP FUNCTION IF EXISTS public.update_user_sub_role(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.update_user_sub_role(
  p_user_id UUID,
  p_sub_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo un Super Admin activo puede cambiar sub-roles.');
  END IF;

  IF p_sub_role NOT IN ('super_admin', 'warehouse_admin', 'accountant', 'viewer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sub-rol inválido: ' || COALESCE(p_sub_role, 'NULL'));
  END IF;

  UPDATE public.profiles
  SET sub_role = p_sub_role
  WHERE id = p_user_id
    AND role = 'admin';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario administrador no encontrado.');
  END IF;

  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'sub_role_changed',
    'profile',
    p_user_id,
    jsonb_build_object('new_sub_role', p_sub_role)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_user_sub_role(UUID, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_user_sub_role(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_order_payment_status(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_total_paid NUMERIC;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT ROUND(COALESCE(SUM(amount), 0), 2) INTO v_total_paid
  FROM public.order_payments WHERE order_id = p_order_id;

  IF v_total_paid >= ROUND(v_order.total_amount, 2) - 0.01 THEN
    UPDATE public.orders SET payment_status = 'paid' WHERE id = p_order_id;
  ELSIF v_total_paid > 0 THEN
    UPDATE public.orders SET payment_status = 'partial' WHERE id = p_order_id;
  ELSE
    UPDATE public.orders SET payment_status = 'unpaid' WHERE id = p_order_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_order_payment_status(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_order_payment_status(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_distributor_payment_atomic(
  p_payment_id UUID,
  p_received_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_reviewer_id UUID := auth.uid();
  v_alloc JSONB;
  v_alloc_order_id UUID;
  v_alloc_amount NUMERIC;
  v_order RECORD;
  v_already_paid NUMERIC;
  v_remaining NUMERIC;
  v_total_allocated NUMERIC := 0;
  v_dist_name TEXT;
  v_seen_order_ids UUID[] := '{}';
BEGIN
  IF v_reviewer_id IS NULL OR NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo un Super Admin activo puede aprobar pagos.');
  END IF;

  SELECT * INTO v_payment FROM public.distributor_payments
  WHERE id = p_payment_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado o ya fue revisado');
  END IF;

  IF v_payment.payment_method = 'efectivo' AND (p_received_by IS NULL OR TRIM(p_received_by) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Para pagos en efectivo, se requiere el campo "Recibido por"');
  END IF;

  IF v_payment.allocations IS NOT NULL AND jsonb_array_length(v_payment.allocations) > 0 THEN
    IF COALESCE(v_payment.container_amount, 0) > 0
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_payment.allocations) a
         WHERE a->>'order_id' IS NULL OR TRIM(a->>'order_id') = ''
       ) THEN
      v_payment.allocations := v_payment.allocations || jsonb_build_array(
        jsonb_build_object('order_id', NULL, 'amount', v_payment.container_amount)
      );
    END IF;
  ELSIF v_payment.order_id IS NOT NULL THEN
    v_payment.allocations := jsonb_build_array(
      jsonb_build_object('order_id', v_payment.order_id, 'amount', v_payment.amount)
    );
  ELSIF v_payment.payment_type = 'containers' OR v_payment.container_amount > 0 THEN
    v_payment.allocations := jsonb_build_array(
      jsonb_build_object('order_id', NULL, 'amount', v_payment.amount)
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'El pago no tiene pedidos ni contenedores asignados');
  END IF;

  FOR v_alloc IN SELECT value FROM jsonb_array_elements(v_payment.allocations)
  LOOP
    IF v_alloc->>'order_id' IS NULL OR TRIM(v_alloc->>'order_id') = '' THEN
      BEGIN
        v_alloc_amount := (v_alloc->>'amount')::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error',
          FORMAT('Monto inválido en asignación de contenedor: "%s"', COALESCE(v_alloc->>'amount', 'NULL')));
      END;

      IF v_alloc_amount IS NULL OR v_alloc_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error',
          FORMAT('Monto de contenedor inválido ($%s)', v_alloc_amount));
      END IF;

      v_total_allocated := v_total_allocated + v_alloc_amount;
      CONTINUE;
    END IF;

    BEGIN
      v_alloc_order_id := (v_alloc->>'order_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('order_id inválido: "%s". Se esperaba un UUID válido.',
          COALESCE(v_alloc->>'order_id', 'NULL')));
    END;

    BEGIN
      v_alloc_amount := (v_alloc->>'amount')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('Monto inválido: "%s" en asignación para pedido %s.',
          COALESCE(v_alloc->>'amount', 'NULL'), v_alloc_order_id));
    END;

    IF v_alloc_amount IS NULL OR v_alloc_amount <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('Monto inválido ($%s) en asignación para pedido %s',
          v_alloc_amount, v_alloc_order_id));
    END IF;

    IF v_alloc_order_id = ANY(v_seen_order_ids) THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('El pedido %s aparece más de una vez en las asignaciones.', v_alloc_order_id));
    END IF;
    v_seen_order_ids := array_append(v_seen_order_ids, v_alloc_order_id);

    v_total_allocated := v_total_allocated + v_alloc_amount;
  END LOOP;

  IF ROUND(v_total_allocated, 2) <> ROUND(v_payment.amount, 2) THEN
    RETURN jsonb_build_object('success', false, 'error',
      FORMAT('La suma de asignaciones ($%s) no coincide con el monto del pago ($%s)',
        TO_CHAR(v_total_allocated, 'FM999,999.00'),
        TO_CHAR(v_payment.amount, 'FM999,999.00')));
  END IF;

  FOR v_alloc IN
    SELECT value FROM jsonb_array_elements(v_payment.allocations)
    ORDER BY value->>'order_id'
  LOOP
    IF v_alloc->>'order_id' IS NULL OR TRIM(v_alloc->>'order_id') = '' THEN
      CONTINUE;
    END IF;

    v_alloc_order_id := (v_alloc->>'order_id')::UUID;
    v_alloc_amount := (v_alloc->>'amount')::NUMERIC;

    SELECT * INTO v_order FROM public.orders
    WHERE id = v_alloc_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('Pedido %s no existe', v_alloc_order_id));
    END IF;

    IF v_order.distributor_id IS DISTINCT FROM v_payment.distributor_id THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('El pedido %s no pertenece al distribuidor que registró el pago', v_alloc_order_id));
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_already_paid
    FROM public.order_payments WHERE order_id = v_alloc_order_id;

    v_remaining := v_order.total_amount - v_already_paid;

    IF ROUND(v_alloc_amount, 2) > ROUND(v_remaining, 2) + 0.01 THEN
      RETURN jsonb_build_object('success', false, 'error',
        FORMAT('La asignación de $%s excede el saldo pendiente de $%s en el pedido %s',
          TO_CHAR(v_alloc_amount, 'FM999,999.00'),
          TO_CHAR(v_remaining, 'FM999,999.00'),
          v_alloc_order_id));
    END IF;
  END LOOP;

  UPDATE public.distributor_payments SET
    status = 'approved',
    reviewed_by = v_reviewer_id,
    reviewed_at = now(),
    received_by = CASE WHEN v_payment.payment_method = 'efectivo'
                  THEN TRIM(p_received_by) ELSE received_by END
  WHERE id = p_payment_id;

  FOR v_alloc IN
    SELECT value FROM jsonb_array_elements(v_payment.allocations)
    ORDER BY value->>'order_id'
  LOOP
    IF v_alloc->>'order_id' IS NULL OR TRIM(v_alloc->>'order_id') = '' THEN
      CONTINUE;
    END IF;

    v_alloc_order_id := (v_alloc->>'order_id')::UUID;
    v_alloc_amount := (v_alloc->>'amount')::NUMERIC;

    INSERT INTO public.order_payments (order_id, amount, payment_method, reference, payment_date, notes, registered_by)
    VALUES (
      v_alloc_order_id, ROUND(v_alloc_amount, 2), v_payment.payment_method,
      v_payment.reference, v_payment.payment_date,
      'Aprobado desde pagos distribuidor', v_reviewer_id
    );

    PERFORM public.update_order_payment_status(v_alloc_order_id);
  END LOOP;

  IF v_payment.payment_method = 'efectivo' THEN
    SELECT full_name INTO v_dist_name
    FROM public.profiles WHERE id = v_payment.distributor_id;

    v_dist_name := COALESCE(v_dist_name, 'Distribuidor (sin perfil)');

    INSERT INTO public.cash_movements (type, amount, concept, responsible, reference_id, reference_type, movement_date, created_by)
    VALUES (
      'entry', v_payment.amount,
      'Pago distribuidor: ' || v_dist_name,
      TRIM(p_received_by),
      p_payment_id, 'distributor_payment',
      COALESCE(v_payment.payment_date, CURRENT_DATE),
      v_reviewer_id
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Pago aprobado correctamente');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_distributor_payment_atomic(UUID, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_distributor_payment_atomic(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_distributor_payment(
  p_payment_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  IF NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo un Super Admin activo puede revisar pagos.');
  END IF;

  IF p_action = 'approve' THEN
    RETURN public.approve_distributor_payment_atomic(p_payment_id, NULL);
  ELSIF p_action = 'reject' THEN
    SELECT * INTO v_payment
    FROM public.distributor_payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado.');
    END IF;

    IF v_payment.status != 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este pago ya fue procesado.');
    END IF;

    UPDATE public.distributor_payments
    SET status = 'rejected',
        rejection_reason = COALESCE(p_rejection_reason, 'Rechazado por administración'),
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = p_payment_id;

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Acción inválida (use approve o reject).');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_distributor_payment(UUID, TEXT, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.review_distributor_payment(UUID, TEXT, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.get_user_email(UUID);
CREATE OR REPLACE FUNCTION public.get_user_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NOT public.is_active_admin() AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Only active admins can look up user emails.' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;

  RETURN v_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_email(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_email(UUID) TO authenticated;

-- 3.11 receive_order (validar perfil activo y bloqueo FOR UPDATE)
CREATE OR REPLACE FUNCTION public.receive_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_item RECORD;
  v_is_admin BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado.');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado.');
  END IF;

  v_is_admin := public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']);

  IF v_order.distributor_id IS DISTINCT FROM v_caller_id AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para confirmar la recepción de este pedido.');
  END IF;

  IF v_order.status != 'shipped' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden recibir pedidos en estado enviado (shipped).');
  END IF;

  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    INSERT INTO public.distributor_inventory (distributor_id, product_id, quantity, total_received, updated_at)
    VALUES (v_order.distributor_id, v_item.product_id, v_item.quantity, v_item.quantity, now())
    ON CONFLICT (distributor_id, product_id)
    DO UPDATE SET
      quantity = public.distributor_inventory.quantity + v_item.quantity,
      total_received = public.distributor_inventory.total_received + v_item.quantity,
      updated_at = now();
  END LOOP;

  UPDATE public.orders
  SET status = 'closed',
      delivered_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.receive_order(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.receive_order(UUID) TO authenticated;

-- ============================================================================
-- 4. HALLAZGO #5: DOBLE FIRMA EN SERVIDOR PARA SALIDAS DE CAJA + SUBROLES
-- ============================================================================

-- Asegurar que reference_type en cash_movements permita 'counter_sale', 'recycling_purchase' y 'recycling_sale' además de 'distributor_payment', 'retail_sale', 'manual' (con NOT VALID para no bloquear por filas históricas)
ALTER TABLE public.cash_movements DROP CONSTRAINT IF EXISTS cash_movements_reference_type_check;
ALTER TABLE public.cash_movements ADD CONSTRAINT cash_movements_reference_type_check
  CHECK (
    reference_type IS NULL
    OR reference_type IN (
      'distributor_payment',
      'retail_sale',
      'manual',
      'counter_sale',
      'recycling_purchase',
      'recycling_sale'
    )
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.sign_cash_movement_exit(p_movement_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_mov RECORD;
  v_new_status TEXT;
BEGIN
  IF v_caller_id IS NULL OR NOT public.is_authorized_signer_user(v_caller_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo firmantes autorizados (Alain Ramos / Didier Fernández) pueden firmar salidas de efectivo.');
  END IF;

  SELECT * INTO v_mov
  FROM public.cash_movements
  WHERE id = p_movement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Movimiento de caja no encontrado.');
  END IF;

  IF v_mov.type != 'exit' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo las salidas de caja requieren firma mancomunada.');
  END IF;

  IF v_mov.approval_status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta salida ya cuenta con las 2 firmas requeridas.');
  END IF;

  IF v_mov.approved_by_1 = v_caller_id OR v_mov.approved_by_2 = v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya registraste tu firma en esta salida. Se requiere la firma del segundo autorizador.');
  END IF;

  PERFORM set_config('app.cash_exit_rpc', 'true', true);

  IF v_mov.approved_by_1 IS NULL THEN
    UPDATE public.cash_movements
    SET approved_by_1 = v_caller_id,
        approved_at_1 = now(),
        approval_status = 'partially_signed'
    WHERE id = p_movement_id;
    v_new_status := 'partially_signed';
  ELSE
    UPDATE public.cash_movements
    SET approved_by_2 = v_caller_id,
        approved_at_2 = now(),
        approval_status = 'approved'
    WHERE id = p_movement_id;
    v_new_status := 'approved';
  END IF;

  RETURN jsonb_build_object('success', true, 'approval_status', v_new_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sign_cash_movement_exit(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sign_cash_movement_exit(UUID) TO authenticated;

-- Nota: El trigger trg_enforce_cash_movement_signatures (que bloquea la escritura directa de firmas
-- desde el navegador) se activa en la Fase 2 (Contract) para que el portal en producción pueda seguir
-- firmando durante la ventana entre Expand y el despliegue del nuevo frontend.

-- ============================================================================
-- 5. HALLAZGO #7: CONCILIACIÓN BANCARIA UNIFICADA CON APROBACIÓN INDIVIDUAL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_matched_payments(p_batch_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_movement RECORD;
  v_result JSONB;
  v_approved_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_errors JSONB := '[]'::jsonb;
BEGIN
  IF v_caller_id IS NULL OR NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo un Super Admin activo puede aprobar lotes de conciliación bancaria.');
  END IF;

  FOR v_movement IN
    SELECT bm.id AS movement_id, bm.matched_payment_id
    FROM public.bank_movements bm
    WHERE bm.batch_id = p_batch_id
      AND bm.match_status = 'matched'
      AND bm.matched_payment_id IS NOT NULL
    ORDER BY bm.id
    FOR UPDATE
  LOOP
    -- Reutilizar exactamente approve_distributor_payment_atomic para respetar bloqueos, límites de sobrepago y asignaciones múltiples (allocations)
    v_result := public.approve_distributor_payment_atomic(
      v_movement.matched_payment_id,
      'Conciliación Bancaria'
    );

    IF COALESCE((v_result->>'success')::boolean, false) = true THEN
      UPDATE public.distributor_payments
      SET bank_movement_id = v_movement.movement_id
      WHERE id = v_movement.matched_payment_id;

      v_approved_count := v_approved_count + 1;
    ELSE
      v_skipped_count := v_skipped_count + 1;
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'movement_id', v_movement.movement_id,
          'payment_id', v_movement.matched_payment_id,
          'error', COALESCE(v_result->>'error', 'Error desconocido')
        )
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'approved_count', v_approved_count,
    'skipped_count', v_skipped_count,
    'errors', v_errors
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_matched_payments(TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_matched_payments(TEXT) TO authenticated;

-- ============================================================================
-- 6. HALLAZGO #8: OPERACIONES ATÓMICAS E IDEMPOTENTES EN MOSTRADOR
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_counter_sale_atomic(TEXT, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.create_counter_sale_atomic(TEXT, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB, TEXT);
CREATE OR REPLACE FUNCTION public.create_counter_sale_atomic(
  p_sale_number TEXT,
  p_warehouse_id UUID,
  p_sold_by UUID,
  p_seller_name TEXT,
  p_customer_name TEXT,
  p_payment_method TEXT,
  p_subtotal NUMERIC,
  p_total NUMERIC,
  p_amount_received NUMERIC,
  p_notes TEXT,
  p_items JSONB,
  p_seller_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_existing_sale RECORD;
  v_sale RECORD;
  v_item JSONB;
  v_stock_res JSONB;
  v_cred_res JSONB;
  v_actor_id UUID;
  v_actor_name TEXT;
BEGIN
  IF v_caller_id IS NULL OR NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para registrar ventas en mostrador.');
  END IF;

  -- Validar atribución del vendedor en servidor (cierra suplantación de p_sold_by / p_seller_name)
  IF btrim(COALESCE(p_seller_code, '')) <> '' THEN
    v_cred_res := public.verify_staff_credential(p_seller_code, 'counter_sale');
    IF COALESCE((v_cred_res->>'valid')::boolean, false) IS NOT TRUE THEN
      RETURN jsonb_build_object('success', false, 'error', COALESCE(v_cred_res->>'error', 'Credencial de vendedor inválida.'));
    END IF;
    v_actor_id := (v_cred_res->>'user_id')::UUID;
    v_actor_name := v_cred_res->>'full_name';
  ELSE
    IF p_sold_by IS NOT NULL AND p_sold_by IS DISTINCT FROM v_caller_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'No puedes atribuir una venta a otro colaborador sin verificar su PIN o código de empleado.');
    END IF;
    v_actor_id := v_caller_id;
    SELECT COALESCE(full_name, email, 'Vendedor') INTO v_actor_name FROM public.profiles WHERE id = v_caller_id;
  END IF;

  -- Idempotencia por sale_number
  SELECT * INTO v_existing_sale
  FROM public.counter_sales
  WHERE sale_number = p_sale_number
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'sale', row_to_json(v_existing_sale)::jsonb
    );
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La venta debe incluir al menos un producto.');
  END IF;

  -- 1. Descontar stock primero con bloqueo FOR UPDATE (si algún SKU no tiene stock suficiente, aborta toda la transacción)
  PERFORM set_config('app.trusted_stock_caller', 'true', true);
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_stock_res := public.adjust_warehouse_stock_atomic(
      p_product_id := (v_item->>'product_id')::UUID,
      p_warehouse_id := p_warehouse_id,
      p_quantity_change := -((v_item->>'quantity')::INT),
      p_reason := 'Venta en mostrador ' || p_sale_number,
      p_created_by := v_actor_id
    );

    IF COALESCE((v_stock_res->>'success')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION '%', COALESCE(v_stock_res->>'error', 'Error al descontar inventario en mostrador.');
    END IF;
  END LOOP;

  -- 2. Insertar registro en counter_sales
  INSERT INTO public.counter_sales (
    sale_number, warehouse_id, sold_by, customer_name, payment_method,
    subtotal, total, amount_received, notes, items, status
  )
  VALUES (
    p_sale_number,
    p_warehouse_id,
    v_actor_id,
    COALESCE(NULLIF(btrim(p_customer_name), ''), 'Público General'),
    p_payment_method,
    p_subtotal,
    p_total,
    p_amount_received,
    p_notes,
    p_items,
    'completed'
  )
  RETURNING * INTO v_sale;

  -- 3. Si es Efectivo, insertar entrada en cash_movements dentro de la misma transacción
  IF LOWER(COALESCE(p_payment_method, '')) = 'efectivo' THEN
    INSERT INTO public.cash_movements (
      type, amount, concept, responsible, reference_id, reference_type,
      movement_date, created_by, approval_status
    )
    VALUES (
      'entry',
      p_total,
      'Venta mostrador #' || p_sale_number,
      COALESCE(NULLIF(btrim(v_actor_name), ''), 'Vendedor'),
      v_sale.id,
      'counter_sale',
      (now() AT TIME ZONE 'America/Mexico_City')::date,
      v_actor_id,
      'approved'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'sale', row_to_json(v_sale)::jsonb
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_counter_sale_atomic(TEXT, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_counter_sale_atomic(TEXT, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.return_counter_sale_atomic(
  p_sale_id UUID,
  p_auth_code TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_auth_res JSONB;
  v_approver_id UUID;
  v_approver_name TEXT;
  v_sale RECORD;
  v_item JSONB;
  v_pid UUID;
  v_stock_res JSONB;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF v_caller_id IS NULL OR NOT public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para procesar devoluciones en mostrador.');
  END IF;

  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El motivo de la devolución es obligatorio.');
  END IF;

  IF btrim(COALESCE(p_auth_code, '')) <> '' THEN
    v_auth_res := public.verify_staff_credential(p_auth_code, 'counter_return');
    IF COALESCE((v_auth_res->>'valid')::boolean, false) IS NOT TRUE THEN
      RETURN jsonb_build_object('success', false, 'error', COALESCE(v_auth_res->>'error', 'Código de autorización no válido o sin facultades de firma.'));
    END IF;
    v_approver_id := (v_auth_res->>'user_id')::UUID;
    v_approver_name := v_auth_res->>'full_name';
  ELSIF public.is_authorized_signer_user(v_caller_id) THEN
    v_approver_id := v_caller_id;
    SELECT COALESCE(full_name, email, 'Admin') INTO v_approver_name FROM public.profiles WHERE id = v_caller_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Se requiere el PIN o Código de Barras de un firmante autorizado (Signer) para procesar una devolución.');
  END IF;

  SELECT * INTO v_sale
  FROM public.counter_sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Venta de mostrador no encontrada.');
  END IF;

  IF v_sale.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta venta ya fue cancelada/devuelta anteriormente.');
  END IF;

  PERFORM set_config('app.trusted_stock_caller', 'true', true);
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_sale.items, '[]'::jsonb))
  LOOP
    v_pid := NULLIF(v_item->>'product_id', '')::UUID;
    IF v_pid IS NULL AND (v_item->>'sku') IS NOT NULL THEN
      SELECT id INTO v_pid FROM public.products WHERE LOWER(sku) = LOWER(btrim(v_item->>'sku')) LIMIT 1;
    END IF;

    IF v_pid IS NOT NULL AND v_sale.warehouse_id IS NOT NULL THEN
      v_stock_res := public.adjust_warehouse_stock_atomic(
        p_product_id := v_pid,
        p_warehouse_id := v_sale.warehouse_id,
        p_quantity_change := COALESCE((v_item->>'quantity')::INT, 0),
        p_reason := 'ENTRADA_DEVOLUCION — Venta Mostrador #' || v_sale.sale_number || ' — Motivo: ' || btrim(p_reason),
        p_created_by := v_approver_id
      );

      IF COALESCE((v_stock_res->>'success')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION '%', COALESCE(v_stock_res->>'error', 'Error al reintegrar stock de devolución.');
      END IF;
    END IF;
  END LOOP;

  IF LOWER(COALESCE(v_sale.payment_method, '')) = 'efectivo' THEN
    PERFORM set_config('app.cash_exit_rpc', 'true', true);
    INSERT INTO public.cash_movements (
      type, amount, concept, responsible, reference_id, reference_type,
      notes, movement_date, created_by, approval_status
    )
    VALUES (
      'exit',
      COALESCE(v_sale.total, 0),
      'Egreso por Devolución Venta Mostrador #' || v_sale.sale_number,
      COALESCE(v_approver_name, 'Signer'),
      v_sale.id,
      'counter_sale',
      'Motivo devolución: ' || btrim(p_reason),
      (v_now AT TIME ZONE 'America/Mexico_City')::date,
      v_caller_id,
      'approved'
    );
  END IF;

  UPDATE public.counter_sales
  SET status = 'cancelled',
      cancel_reason = btrim(p_reason),
      cancelled_by = v_caller_id,
      approved_by = v_approver_id,
      cancelled_at = v_now
  WHERE id = p_sale_id;

  RETURN jsonb_build_object(
    'success', true,
    'approver_id', v_approver_id,
    'approver_name', v_approver_name,
    'cancelled_at', v_now
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.return_counter_sale_atomic(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.return_counter_sale_atomic(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 7. BARRIDO DE SEGURIDAD SOBRE pg_proc (SIN ALTERAR adjust_warehouse_stock NI RPCs DE INBOX / ÚLTIMA MILLA)
-- ============================================================================
-- Nota: adjust_warehouse_stock, create_retail_sale, register_lastmile_prepayment,
-- settle_lastmile_orders, dispatch_lastmile_order, mark_lastmile_delivered,
-- return_lastmile_order, get_lastmile_checkout y submit_lastmile_checkout
-- conservan su comportamiento y permisos efectivos actuales en esta fase.
DO $$
DECLARE
  v_fn RECORD;
BEGIN
  FOR v_fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'is_active_admin',
        'has_admin_sub_role',
        'is_authorized_signer_user',
        'is_explicit_super_admin',
        'upsert_staff_credentials',
        'get_staff_credentials_metadata',
        'verify_staff_credential',
        'adjust_warehouse_stock_atomic',
        'transfer_stock',
        'confirm_order',
        'cancel_order',
        'reject_order',
        'ship_order',
        'receive_order',
        'register_payment',
        'update_order_item_quantity',
        'add_item_to_order',
        'remove_item_from_order',
        'delete_user',
        'delete_users',
        'update_user_sub_role',
        'update_order_payment_status',
        'approve_distributor_payment_atomic',
        'review_distributor_payment',
        'approve_matched_payments',
        'get_user_email',
        'sign_cash_movement_exit',
        'create_counter_sale_atomic',
        'return_counter_sale_atomic'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', v_fn.proname, v_fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', v_fn.proname, v_fn.args);
  END LOOP;
END $$;

COMMIT;
