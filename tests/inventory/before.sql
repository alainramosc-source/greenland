CREATE OR REPLACE FUNCTION public.adjust_warehouse_stock(p_product_id uuid, p_warehouse_id uuid, p_quantity_change integer, p_reason text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_qty_before INT;
  v_qty_after INT;
  v_sku TEXT;
  v_wh_name TEXT;
BEGIN
  SELECT COALESCE(stock_quantity, 0) INTO v_qty_before
  FROM warehouse_stock
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id;

  IF v_qty_before IS NULL THEN
    v_qty_before := 0;
  END IF;

  v_qty_after := GREATEST(v_qty_before + p_quantity_change, 0);

  SELECT sku INTO v_sku FROM products WHERE id = p_product_id;
  SELECT name INTO v_wh_name FROM warehouses WHERE id = p_warehouse_id;

  INSERT INTO warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
  VALUES (p_warehouse_id, p_product_id, GREATEST(p_quantity_change, 0), 0)
  ON CONFLICT (warehouse_id, product_id) DO UPDATE
  SET stock_quantity = v_qty_after,
      updated_at = NOW();

  INSERT INTO audit_log (action, entity_type, entity_id, user_id, details)
  VALUES (
    CASE WHEN p_quantity_change > 0 THEN 'stock_increase' ELSE 'stock_decrease' END,
    'warehouse_stock',
    p_product_id,
    p_created_by,
    jsonb_build_object(
      'sku', v_sku,
      'warehouse', v_wh_name,
      'before', v_qty_before,
      'change', p_quantity_change,
      'after', v_qty_after,
      'reason', p_reason
    )
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.adjust_warehouse_stock_atomic(p_product_id uuid, p_warehouse_id uuid, p_quantity_change integer, p_reason text DEFAULT 'Manual adjustment'::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.advance_count_session(p_session_id uuid, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_session RECORD;
    v_line RECORD;
    v_current_stock INT;
    v_adjustment INT;
BEGIN
    -- Get session
    SELECT * INTO v_session FROM inventory_count_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sesión no encontrada');
    END IF;

    -- Verify admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    -- SUBMIT: in_progress → submitted
    IF p_action = 'submit' THEN
        IF v_session.status NOT IN ('draft', 'in_progress') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Solo se puede enviar desde borrador o en progreso');
        END IF;

        -- Check at least 1 line is counted
        IF NOT EXISTS (SELECT 1 FROM inventory_count_lines WHERE session_id = p_session_id AND qty_counted IS NOT NULL) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Debe haber al menos una línea contada');
        END IF;

        UPDATE inventory_count_sessions SET
            status = 'submitted',
            submitted_at = now(),
            submitted_by = auth.uid()
        WHERE id = p_session_id;

        INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'count_submitted', 'inventory_count', p_session_id,
            jsonb_build_object('session_code', v_session.session_code));

        RETURN jsonb_build_object('success', true, 'new_status', 'submitted');
    END IF;

    -- APPROVE: submitted → approved
    IF p_action = 'approve' THEN
        IF v_session.status != 'submitted' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Solo se puede aprobar desde estado enviado');
        END IF;

        UPDATE inventory_count_sessions SET
            status = 'approved',
            approved_at = now(),
            approved_by = auth.uid()
        WHERE id = p_session_id;

        INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'count_approved', 'inventory_count', p_session_id,
            jsonb_build_object('session_code', v_session.session_code));

        RETURN jsonb_build_object('success', true, 'new_status', 'approved');
    END IF;

    -- POST: approved → posted (apply stock adjustments)
    IF p_action = 'post' THEN
        IF v_session.status != 'approved' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Solo se puede aplicar desde estado aprobado');
        END IF;

        -- Process each line with a difference
        FOR v_line IN
            SELECT cl.*, p.sku as product_sku
            FROM inventory_count_lines cl
            JOIN products p ON p.id = cl.product_id
            WHERE cl.session_id = p_session_id
              AND cl.qty_counted IS NOT NULL
              AND cl.qty_counted != cl.qty_system_snapshot
        LOOP
            -- Get current stock in warehouse
            SELECT COALESCE(stock_quantity, 0) INTO v_current_stock
            FROM warehouse_stock
            WHERE product_id = v_line.product_id AND warehouse_id = v_session.warehouse_id;

            -- If no record exists, current stock is 0
            IF NOT FOUND THEN
                v_current_stock := 0;
            END IF;

            v_adjustment := v_line.qty_counted - v_line.qty_system_snapshot;

            -- Create adjustment record (immutable audit)
            INSERT INTO inventory_adjustments (session_id, product_id, warehouse_id, qty_before, qty_after, adjustment, reason, created_by)
            VALUES (p_session_id, v_line.product_id, v_session.warehouse_id, v_current_stock, v_current_stock + v_adjustment, v_adjustment, v_line.reason, auth.uid());

            -- Update warehouse_stock
            INSERT INTO warehouse_stock (product_id, warehouse_id, stock_quantity, reserved_quantity)
            VALUES (v_line.product_id, v_session.warehouse_id, v_current_stock + v_adjustment, 0)
            ON CONFLICT (product_id, warehouse_id)
            DO UPDATE SET stock_quantity = warehouse_stock.stock_quantity + v_adjustment;

            -- Also update products.stock_quantity (total)
            UPDATE products SET stock_quantity = stock_quantity + v_adjustment WHERE id = v_line.product_id;
        END LOOP;

        -- Mark session as posted
        UPDATE inventory_count_sessions SET
            status = 'posted',
            posted_at = now(),
            posted_by = auth.uid()
        WHERE id = p_session_id;

        INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'count_posted', 'inventory_count', p_session_id,
            jsonb_build_object('session_code', v_session.session_code, 'adjustments_applied', true));

        RETURN jsonb_build_object('success', true, 'new_status', 'posted');
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Acción no válida');
END;
$function$;


CREATE OR REPLACE FUNCTION public.create_count_session(p_warehouse_id uuid, p_count_type text, p_responsible_user_id uuid, p_notes text DEFAULT NULL::text, p_freeze boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_session_id UUID;
    v_session_code TEXT;
    v_product RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    v_session_code := generate_count_session_code();

    INSERT INTO inventory_count_sessions (
        session_code, warehouse_id, count_type, responsible_user_id,
        notes, freeze_inventory, created_by, status
    ) VALUES (
        v_session_code, p_warehouse_id, p_count_type, p_responsible_user_id,
        p_notes, p_freeze, auth.uid(), 'draft'
    ) RETURNING id INTO v_session_id;

    IF p_count_type = 'full' THEN
        FOR v_product IN
            SELECT p.id, p.sku, COALESCE(ws.stock_quantity, 0) as current_stock
            FROM products p
            LEFT JOIN warehouse_stock ws ON ws.product_id = p.id AND ws.warehouse_id = p_warehouse_id
            WHERE p.is_active = true
            ORDER BY p.sku
        LOOP
            INSERT INTO inventory_count_lines (session_id, product_id, sku, qty_system_snapshot)
            VALUES (v_session_id, v_product.id, v_product.sku, v_product.current_stock);
        END LOOP;
    END IF;

    INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'count_created', 'inventory_count', v_session_id,
        jsonb_build_object('session_code', v_session_code, 'warehouse_id', p_warehouse_id, 'count_type', p_count_type));

    RETURN jsonb_build_object('success', true, 'session_id', v_session_id, 'session_code', v_session_code);
END;
$function$;


CREATE OR REPLACE FUNCTION public.generate_count_session_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_year TEXT;
    v_seq INT;
BEGIN
    v_year := TO_CHAR(now(), 'YYYY');
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(session_code, '-', 3) AS INT)
    ), 0) + 1
    INTO v_seq
    FROM inventory_count_sessions
    WHERE session_code LIKE 'CNT-' || v_year || '-%';

    RETURN 'CNT-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$function$;


CREATE OR REPLACE FUNCTION public.transfer_stock(p_product_id uuid, p_from_warehouse_id uuid, p_to_warehouse_id uuid, p_quantity integer, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;


CREATE OR REPLACE FUNCTION public.block_distributor_manual_stock_adjust()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_role  text;
  v_ctx   text;
  v_outer text;
BEGIN
  -- Sin usuario (SQL Editor, cron, service role) → permitir
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'distributor' THEN
    RETURN NEW;  -- admins y demás roles sin cambios
  END IF;

  -- Función más externa de la pila de llamadas
  GET DIAGNOSTICS v_ctx = PG_CONTEXT;
  v_outer := (regexp_match(v_ctx, '.*function ([[:alnum:]_."]+)\('))[1];

  IF v_outer IS NOT NULL AND v_outer LIKE '%adjust_warehouse_stock%' THEN
    RAISE EXCEPTION 'Los ajustes de inventario solo los puede hacer un administrador. Registra tus salidas con "Venta al Público PRO".'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_block_distributor_manual_stock_adjust BEFORE INSERT OR UPDATE ON public.warehouse_stock FOR EACH ROW EXECUTE FUNCTION block_distributor_manual_stock_adjust();

CREATE OR REPLACE FUNCTION public.sync_product_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE products
  SET stock_quantity = COALESCE((
    SELECT SUM(stock_quantity) FROM warehouse_stock WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  ), 0),
  reserved_quantity = COALESCE((
    SELECT SUM(reserved_quantity) FROM warehouse_stock WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  ), 0)
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER trg_sync_product_stock AFTER INSERT OR DELETE OR UPDATE ON public.warehouse_stock FOR EACH ROW EXECUTE FUNCTION sync_product_stock();
CREATE OR REPLACE FUNCTION public.has_admin_sub_role(p_allowed_sub_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND COALESCE(is_active, true) = true
      AND COALESCE(sub_role, 'super_admin') = ANY(p_allowed_sub_roles)
  );
$function$;
