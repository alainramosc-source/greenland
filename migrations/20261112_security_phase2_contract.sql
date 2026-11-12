-- ============================================================================
-- GREENLAND PRODUCTS — AUDITORÍA DE SEGURIDAD Y CONSISTENCIA FINANCIERA
-- FASE 2: CONTRACT (Ejecutar DESPUÉS de desplegar el nuevo frontend en producción)
-- Rama: security/audit-remediation
-- ============================================================================
-- Cubre:
--   1. Retiro definitivo de authorization_pin y employee_barcode de las lecturas
--      generales de public.profiles (los datos viven en public.staff_credentials
--      y se verifican exclusivamente vía RPC verify_staff_credential).
--   2. Endurecimiento de políticas RLS por sub-rol administrativo en:
--      - cash_movements (lectura para admins activos; inserción para super_admin, admin y warehouse_admin;
--        actualización de campos no firmados o firma vía RPC; contabilidad y viewer solo lectura)
--      - cash_audits (lectura para admins activos; inserción/aplicación solo para super_admin, admin y warehouse_admin)
--      - recycling_purchases, recycling_sales, recycling_material_types, recycling_suppliers (contabilidad y viewer solo lectura)
--      - suppliers y tablas de portal de proveedores (contabilidad y viewer solo lectura; super_admin/admin administran)
--   3. Consulta de diagnóstico de solo lectura para auditar la diferencia de $60 en ORD-555493.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. LIMPIAR CREDENCIALES SENSIBLES DE PUBLIC.PROFILES (HALLAZGO #2 - CONTRACT)
-- ============================================================================

-- Asegurar una última sincronización hacia staff_credentials antes de limpiar profiles
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

-- Desactivar trigger de sincronización antiguo y reemplazarlo por uno que redirija cualquier
-- escritura en profiles.authorization_pin / employee_barcode hacia staff_credentials y deje NULL en profiles
DROP TRIGGER IF EXISTS trg_sync_profile_credentials_to_vault ON public.profiles;

CREATE OR REPLACE FUNCTION public.redirect_and_redact_profile_credentials()
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

    -- Redactar siempre en public.profiles para que ningún SELECT * exponga el PIN ni el barcode
    NEW.authorization_pin := NULL;
    NEW.employee_barcode := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_redirect_and_redact_profile_credentials ON public.profiles;
CREATE TRIGGER trg_redirect_and_redact_profile_credentials
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.redirect_and_redact_profile_credentials();

-- Limpiar los valores históricos en public.profiles (ya respaldados en public.staff_credentials)
UPDATE public.profiles
SET authorization_pin = NULL,
    employee_barcode = NULL
WHERE authorization_pin IS NOT NULL
   OR employee_barcode IS NOT NULL;

-- ============================================================================
-- 2. ENDURECIMIENTO DE POLÍTICAS RLS POR SUB-ROL (HALLAZGO #5 - CONTRACT)
-- ============================================================================

-- 2.1 cash_movements y cash_audits: eliminar TODAS las políticas permisivas previas (incluyendo
-- "Admins can do everything on cash_movements") y recrear políticas granulares por operación
DO $$
DECLARE
  v_table TEXT;
  v_pol RECORD;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['cash_movements', 'cash_audits']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
      FOR v_pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_table
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_table);
      END LOOP;
    END IF;
  END LOOP;
END $$;

CREATE POLICY "Admins can read cash_movements"
  ON public.cash_movements
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "Admins can insert cash_movements"
  ON public.cash_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin'])
  );

CREATE POLICY "Admins can update cash_movements"
  ON public.cash_movements
  FOR UPDATE
  TO authenticated
  USING (
    public.is_authorized_signer_user(auth.uid())
    OR (
      public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin'])
      AND COALESCE(approval_status, 'pending_signatures') != 'approved'
      AND approved_by_1 IS NULL
      AND approved_by_2 IS NULL
    )
  )
  WITH CHECK (
    public.is_authorized_signer_user(auth.uid())
    OR (
      public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin'])
      AND COALESCE(approval_status, 'pending_signatures') != 'approved'
      AND approved_by_1 IS NULL
      AND approved_by_2 IS NULL
    )
  );

CREATE POLICY "Admins can delete cash_movements"
  ON public.cash_movements
  FOR DELETE
  TO authenticated
  USING (
    public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin'])
    AND (
      COALESCE(approval_status, 'pending_signatures') != 'approved'
      OR reference_type IN ('recycling_purchase', 'recycling_sale')
    )
  );

-- 2.2 cash_audits: lectura para admins activos (incluyendo contabilidad y viewer);
-- inserción y aplicación restringidas a super_admin, admin y warehouse_admin
CREATE POLICY "cash_audits_select_admin"
  ON public.cash_audits
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "cash_audits_insert_admin"
  ON public.cash_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin'])
  );

CREATE POLICY "cash_audits_update_admin"
  ON public.cash_audits
  FOR UPDATE
  TO authenticated
  USING (
    public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin'])
  )
  WITH CHECK (
    public.has_admin_sub_role(ARRAY['super_admin', 'admin', 'warehouse_admin'])
  );

-- 2.3 Reciclaje: restringir escritura a super_admin, admin y warehouse_admin (contabilidad y viewer solo lectura)
DO $$
DECLARE
  v_table TEXT;
  v_pol RECORD;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'recycling_purchases',
    'recycling_sales',
    'recycling_material_types',
    'recycling_suppliers'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

      FOR v_pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_table
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_table);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_active_admin())',
        v_table || '_select_active_admin', v_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_admin_sub_role(ARRAY[''super_admin'', ''admin'', ''warehouse_admin'']))',
        v_table || '_insert_ops_admin', v_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.has_admin_sub_role(ARRAY[''super_admin'', ''admin'', ''warehouse_admin''])) WITH CHECK (public.has_admin_sub_role(ARRAY[''super_admin'', ''admin'', ''warehouse_admin'']))',
        v_table || '_update_ops_admin', v_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.has_admin_sub_role(ARRAY[''super_admin'', ''admin'']))',
        v_table || '_delete_super_admin', v_table
      );
    END IF;
  END LOOP;
END $$;

-- 2.4 Portal de Proveedores: conservar Contabilidad y Viewer como solo lectura en base de datos
DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'suppliers',
    'service_orders',
    'service_order_evidence',
    'service_order_invoices',
    'service_order_comments',
    'service_contracts',
    'contract_charges',
    'contract_charge_invoices'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

      EXECUTE format('DROP POLICY IF EXISTS "admin_all_suppliers" ON public.%I', v_table);
      EXECUTE format('DROP POLICY IF EXISTS "admin_all_service_orders" ON public.%I', v_table);
      EXECUTE format('DROP POLICY IF EXISTS "admin_all_so_evidence" ON public.%I', v_table);
      EXECUTE format('DROP POLICY IF EXISTS "admin_all_so_invoices" ON public.%I', v_table);
      EXECUTE format('DROP POLICY IF EXISTS "admin_all_so_comments" ON public.%I', v_table);
      EXECUTE format('DROP POLICY IF EXISTS "admin_all_contracts" ON public.%I', v_table);
      EXECUTE format('DROP POLICY IF EXISTS "admin_all_charges" ON public.%I', v_table);
      EXECUTE format('DROP POLICY IF EXISTS "admin_all_charge_invoices" ON public.%I', v_table);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_select_active_admin', v_table);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_write_super_admin', v_table);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_active_admin())',
        v_table || '_select_active_admin', v_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_explicit_super_admin()) WITH CHECK (public.is_explicit_super_admin())',
        v_table || '_write_super_admin', v_table
      );
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- 3. CONSULTA DE AUDITORÍA (SOLO LECTURA) PARA PEDIDO ORD-555493 (HALLAZGO #7)
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase para inspeccionar el desglose exacto
-- de los $54,930 en pagos frente a $54,870 de total ($60 de diferencia) antes de
-- realizar cualquier ajuste contable:
/*
SELECT
  o.id AS order_id,
  o.order_number,
  o.total_amount AS order_total,
  o.payment_status,
  (SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) FROM public.order_items oi WHERE oi.order_id = o.id) AS items_sum,
  (SELECT COALESCE(SUM(op.amount), 0) FROM public.order_payments op WHERE op.order_id = o.id) AS order_payments_sum,
  (SELECT jsonb_agg(jsonb_build_object(
      'id', op.id,
      'amount', op.amount,
      'method', op.payment_method,
      'reference', op.reference,
      'notes', op.notes,
      'created_at', op.created_at
   ) ORDER BY op.created_at)
   FROM public.order_payments op WHERE op.order_id = o.id
  ) AS order_payments_detail,
  (SELECT jsonb_agg(jsonb_build_object(
      'payment_id', dp.id,
      'payment_amount', dp.amount,
      'allocated_amount', poa.amount_allocated,
      'status', dp.status,
      'reference', dp.reference,
      'bank_movement_id', dp.bank_movement_id,
      'reviewed_at', dp.reviewed_at
   ))
   FROM public.distributor_payments dp
   LEFT JOIN public.payment_order_allocations poa ON poa.payment_id = dp.id AND poa.order_id = o.id
   WHERE dp.order_id = o.id OR poa.order_id = o.id
  ) AS distributor_payments_detail
FROM public.orders o
WHERE o.order_number = 'ORD-555493';
*/

