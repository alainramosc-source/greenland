-- ============================================================
-- ENVÍOS A DOMICILIO — Surtido, entrega, cobro y liquidación
-- ------------------------------------------------------------
-- CORRER EN SUPABASE *DESPUÉS* DE QUE VERCEL TERMINE DE DESPLEGAR
-- el código que usa estas funciones.
--
-- 1. Rol 'driver' (chofer) en profiles
-- 2. Estatus y columnas nuevas en lastmile_orders
-- 3. Seguridad: se quita el acceso público total a lastmile_orders;
--    el cliente solo puede ver/llenar SU pedido vía token (RPCs)
-- 4. create_retail_sale: los envíos ya NO descuentan inventario al crear el link
-- 5. RPCs: surtir (sale inventario), entregar, devolver, pago anticipado, liquidar ruta
-- 6. Respaldo: marca como "ya descontado" los envíos creados con la versión anterior
-- ============================================================

-- ------------------------------------------------------------
-- 1. ROL CHOFER
-- ------------------------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['admin', 'distributor', 'supplier', 'driver']));

-- ------------------------------------------------------------
-- 2. ESTATUS Y COLUMNAS
-- ------------------------------------------------------------
-- in_delivery se conserva solo por compatibilidad con registros viejos
ALTER TABLE lastmile_orders DROP CONSTRAINT IF EXISTS lastmile_orders_status_check;
ALTER TABLE lastmile_orders ADD CONSTRAINT lastmile_orders_status_check
  CHECK (status = ANY (ARRAY[
    'pending', 'confirmed', 'in_delivery', 'in_transit',
    'delivered', 'returned', 'partially_returned', 'cancelled'
  ]));

ALTER TABLE lastmile_orders
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS warehouse_id        UUID REFERENCES warehouses(id),
  -- Surtido / salida de inventario
  ADD COLUMN IF NOT EXISTS stock_deducted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatched_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatched_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_driver_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Entrega y cobro
  ADD COLUMN IF NOT EXISTS delivered_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS collected_method    TEXT,
  ADD COLUMN IF NOT EXISTS collected_amount    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS delivery_notes      TEXT,
  -- Pago anticipado
  ADD COLUMN IF NOT EXISTS prepaid_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prepaid_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Liquidación de ruta
  ADD COLUMN IF NOT EXISTS settled_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settled_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Devoluciones
  ADD COLUMN IF NOT EXISTS return_reason       TEXT,
  ADD COLUMN IF NOT EXISTS return_notes        TEXT,
  ADD COLUMN IF NOT EXISTS return_evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS returned_items      JSONB,
  ADD COLUMN IF NOT EXISTS returned_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restocked_at        TIMESTAMPTZ;

ALTER TABLE lastmile_orders DROP CONSTRAINT IF EXISTS lastmile_orders_collected_method_check;
ALTER TABLE lastmile_orders ADD CONSTRAINT lastmile_orders_collected_method_check
  CHECK (collected_method IS NULL OR collected_method = ANY (ARRAY['cash', 'transfer', 'card', 'prepaid', 'none']));

CREATE INDEX IF NOT EXISTS idx_lastmile_orders_driver ON lastmile_orders(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lastmile_orders_status ON lastmile_orders(status);

-- Helpers de rol
CREATE OR REPLACE FUNCTION lastmile_is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION lastmile_is_driver() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver');
$$;

-- ------------------------------------------------------------
-- 3. SEGURIDAD (RLS)
-- ------------------------------------------------------------
-- Antes: cualquiera (sin sesión) podía leer y modificar TODOS los pedidos.
DROP POLICY IF EXISTS "public_lastmile_checkout" ON lastmile_orders;
DROP POLICY IF EXISTS "public_lastmile_update"   ON lastmile_orders;

-- El chofer solo ve los envíos que tiene asignados (escribe solo vía RPC)
DROP POLICY IF EXISTS "driver_lastmile_select" ON lastmile_orders;
CREATE POLICY "driver_lastmile_select" ON lastmile_orders
  FOR SELECT USING (assigned_driver_id = auth.uid());

-- Formulario público del cliente: solo lo necesario, solo por token
CREATE OR REPLACE FUNCTION get_lastmile_checkout(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_order lastmile_orders%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 10 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order FROM lastmile_orders WHERE checkout_token = p_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'items', v_order.items,
    'total', v_order.total,
    'status', v_order.status,
    'already_submitted', (v_order.customer_name IS NOT NULL AND v_order.address_street IS NOT NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION submit_lastmile_checkout(p_token TEXT, p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_order lastmile_orders%ROWTYPE;
  v_req   TEXT;
BEGIN
  SELECT * INTO v_order FROM lastmile_orders WHERE checkout_token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link no válido';
  END IF;

  IF v_order.customer_name IS NOT NULL AND v_order.address_street IS NOT NULL THEN
    RAISE EXCEPTION 'Los datos de entrega de este pedido ya fueron registrados';
  END IF;

  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Este pedido ya no admite cambios';
  END IF;

  FOREACH v_req IN ARRAY ARRAY[
    'customer_name', 'customer_phone', 'address_street', 'address_ext_number',
    'address_colony', 'address_municipality', 'address_zip', 'address_state',
    'address_between_streets', 'address_references'
  ] LOOP
    IF COALESCE(btrim(p_data->>v_req), '') = '' THEN
      RAISE EXCEPTION 'Falta el campo obligatorio: %', v_req;
    END IF;
  END LOOP;

  IF (p_data->>'lat') IS NULL OR (p_data->>'lng') IS NULL THEN
    RAISE EXCEPTION 'Falta colocar el pin en el mapa';
  END IF;

  UPDATE lastmile_orders SET
    customer_name           = left(btrim(p_data->>'customer_name'), 200),
    customer_phone          = left(btrim(p_data->>'customer_phone'), 40),
    customer_alt_contact    = NULLIF(left(btrim(p_data->>'customer_alt_contact'), 200), ''),
    customer_alt_phone      = NULLIF(left(btrim(p_data->>'customer_alt_phone'), 40), ''),
    address_street          = left(btrim(p_data->>'address_street'), 200),
    address_ext_number      = left(btrim(p_data->>'address_ext_number'), 40),
    address_int_number      = NULLIF(left(btrim(p_data->>'address_int_number'), 40), ''),
    address_colony          = left(btrim(p_data->>'address_colony'), 200),
    address_municipality    = left(btrim(p_data->>'address_municipality'), 200),
    address_city            = left(btrim(p_data->>'address_municipality'), 200),
    address_zip             = left(btrim(p_data->>'address_zip'), 10),
    address_state           = left(btrim(p_data->>'address_state'), 100),
    address_between_streets = left(btrim(p_data->>'address_between_streets'), 300),
    address_references      = left(btrim(p_data->>'address_references'), 500),
    address_line            = left(btrim(p_data->>'address_street'), 200) || ' #' || left(btrim(p_data->>'address_ext_number'), 40)
                              || COALESCE(' Int. ' || NULLIF(btrim(p_data->>'address_int_number'), ''), '')
                              || ', ' || left(btrim(p_data->>'address_colony'), 200),
    lat                     = (p_data->>'lat')::DOUBLE PRECISION,
    lng                     = (p_data->>'lng')::DOUBLE PRECISION,
    special_instructions    = NULLIF(left(btrim(p_data->>'special_instructions'), 1000), ''),
    status                  = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
    confirmed_at            = now(),
    updated_at              = now()
  WHERE id = v_order.id;

  RETURN jsonb_build_object('success', true, 'order_number', v_order.order_number);
END;
$$;

GRANT EXECUTE ON FUNCTION get_lastmile_checkout(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_lastmile_checkout(TEXT, JSONB) TO anon, authenticated;

-- ------------------------------------------------------------
-- 4. create_retail_sale — envíos ya no descuentan al crear el link
--    (se respeta search_path y extensions.gen_random_bytes de producción)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_retail_sale(
  p_conversation_id uuid DEFAULT NULL::uuid,
  p_warehouse_id uuid DEFAULT NULL::uuid,
  p_delivery_type text DEFAULT 'delivery'::text,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_order_id UUID;
  v_token TEXT;
  v_order_number TEXT;
  v_item JSONB;
  v_subtotal NUMERIC := 0;
  v_stock INT;
  v_wh_name TEXT;
BEGIN
  IF p_warehouse_id IS NULL THEN
    SELECT id INTO p_warehouse_id FROM warehouses WHERE code = 'vito-alessio';
  END IF;

  SELECT name INTO v_wh_name FROM warehouses WHERE id = p_warehouse_id;

  v_token := encode(extensions.gen_random_bytes(8), 'hex');
  v_order_number := 'VP-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(v_token, 1, 4));

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + ((v_item->>'quantity')::INT * (v_item->>'sale_price')::NUMERIC);
  END LOOP;

  INSERT INTO lastmile_orders (
    distributor_id, conversation_id, checkout_token, order_number,
    delivery_type, items, subtotal, total, notes, status, warehouse_name, warehouse_id
  ) VALUES (
    auth.uid(), p_conversation_id, v_token, v_order_number,
    p_delivery_type, p_items, v_subtotal, v_subtotal, p_notes,
    CASE WHEN p_delivery_type = 'pickup' THEN 'confirmed' ELSE 'pending' END,
    v_wh_name, p_warehouse_id
  )
  RETURNING id INTO v_order_id;

  -- Envío a domicilio: el inventario sale al SURTIR (dispatch_lastmile_order)
  IF p_delivery_type = 'pickup' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      CONTINUE WHEN (v_item->>'product_id') IS NULL;

      SELECT stock_quantity INTO v_stock FROM warehouse_stock
      WHERE warehouse_id = p_warehouse_id AND product_id = (v_item->>'product_id')::UUID;

      IF v_stock IS NOT NULL AND v_stock >= (v_item->>'quantity')::INT THEN
        UPDATE warehouse_stock
        SET stock_quantity = stock_quantity - (v_item->>'quantity')::INT, updated_at = now()
        WHERE warehouse_id = p_warehouse_id AND product_id = (v_item->>'product_id')::UUID;

        INSERT INTO inventory_logs (user_id, product_id, quantity_change, reason)
        VALUES (
          auth.uid(),
          (v_item->>'product_id')::UUID,
          -(v_item->>'quantity')::INT,
          'Venta a público - Orden ' || v_order_number || ' [Bodega: ' || v_wh_name || ']'
        );
      END IF;
    END LOOP;

    UPDATE lastmile_orders SET stock_deducted_at = now() WHERE id = v_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'checkout_token', v_token,
    'order_number', v_order_number,
    'delivery_type', p_delivery_type,
    'total', v_subtotal,
    'warehouse', v_wh_name
  );
END;
$function$;

-- ------------------------------------------------------------
-- 5a. SURTIR / EN RUTA — aquí sale el inventario
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION dispatch_lastmile_order(
  p_order_id UUID,
  p_driver_id UUID,
  p_warehouse_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_order   lastmile_orders%ROWTYPE;
  v_wh_id   UUID;
  v_wh_name TEXT;
  v_item    JSONB;
  v_stock   INT;
  v_qty     INT;
  v_sku     TEXT;
BEGIN
  IF NOT lastmile_is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede surtir envíos';
  END IF;

  SELECT * INTO v_order FROM lastmile_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

  IF v_order.delivery_type <> 'delivery' THEN
    RAISE EXCEPTION 'Este pedido no es de envío a domicilio';
  END IF;
  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'El pedido ya fue surtido o cerrado (estatus: %)', v_order.status;
  END IF;
  IF v_order.customer_name IS NULL OR v_order.address_street IS NULL THEN
    RAISE EXCEPTION 'El cliente todavía no llena sus datos de entrega';
  END IF;

  IF p_driver_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_driver_id AND role IN ('admin', 'driver') AND COALESCE(is_active, true)
  ) THEN
    RAISE EXCEPTION 'Selecciona un chofer válido';
  END IF;

  v_wh_id := COALESCE(p_warehouse_id, v_order.warehouse_id,
                      (SELECT id FROM warehouses WHERE name = v_order.warehouse_name LIMIT 1),
                      (SELECT id FROM warehouses WHERE code = 'vito-alessio'));
  SELECT name INTO v_wh_name FROM warehouses WHERE id = v_wh_id;
  IF v_wh_name IS NULL THEN RAISE EXCEPTION 'Bodega no válida'; END IF;

  IF v_order.stock_deducted_at IS NULL THEN
    -- Validar stock de TODO antes de descontar nada
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb))
    LOOP
      CONTINUE WHEN (v_item->>'product_id') IS NULL;
      v_qty := COALESCE((v_item->>'quantity')::INT, 0);
      CONTINUE WHEN v_qty <= 0;

      SELECT COALESCE(stock_quantity, 0) INTO v_stock FROM warehouse_stock
      WHERE warehouse_id = v_wh_id AND product_id = (v_item->>'product_id')::UUID;
      v_stock := COALESCE(v_stock, 0);

      IF v_stock < v_qty THEN
        v_sku := COALESCE(v_item->>'sku', v_item->>'name', 'producto');
        RAISE EXCEPTION 'Stock insuficiente de % en %: hay %, se necesitan %', v_sku, v_wh_name, v_stock, v_qty;
      END IF;
    END LOOP;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb))
    LOOP
      CONTINUE WHEN (v_item->>'product_id') IS NULL;
      v_qty := COALESCE((v_item->>'quantity')::INT, 0);
      CONTINUE WHEN v_qty <= 0;

      PERFORM adjust_warehouse_stock(
        (v_item->>'product_id')::UUID, v_wh_id, -v_qty,
        'Envío a domicilio - Orden ' || v_order.order_number, auth.uid()
      );
    END LOOP;
  END IF;

  UPDATE lastmile_orders SET
    status             = 'in_transit',
    warehouse_id       = v_wh_id,
    warehouse_name     = v_wh_name,
    stock_deducted_at  = COALESCE(stock_deducted_at, now()),
    dispatched_at      = now(),
    dispatched_by      = auth.uid(),
    assigned_driver_id = p_driver_id,
    updated_at         = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'already_deducted', v_order.stock_deducted_at IS NOT NULL, 'warehouse', v_wh_name);
END;
$$;

-- ------------------------------------------------------------
-- 5b. MARCAR ENTREGADO (chofer asignado o admin) — NO toca caja
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_lastmile_delivered(
  p_order_id UUID,
  p_method TEXT,
  p_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_order lastmile_orders%ROWTYPE;
  v_amount NUMERIC;
BEGIN
  SELECT * INTO v_order FROM lastmile_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

  IF NOT (lastmile_is_admin() OR (lastmile_is_driver() AND v_order.assigned_driver_id = auth.uid())) THEN
    RAISE EXCEPTION 'No tienes permiso para cerrar este envío';
  END IF;

  IF v_order.status NOT IN ('in_transit', 'in_delivery') THEN
    RAISE EXCEPTION 'Solo se puede marcar entregado un envío que está en ruta (estatus: %)', v_order.status;
  END IF;

  IF p_method NOT IN ('cash', 'transfer', 'card', 'prepaid', 'none') THEN
    RAISE EXCEPTION 'Forma de pago no válida';
  END IF;

  IF p_method = 'prepaid' AND v_order.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'Este pedido no tiene pago anticipado registrado';
  END IF;

  v_amount := CASE WHEN p_method IN ('prepaid', 'none') THEN 0 ELSE COALESCE(p_amount, v_order.total) END;
  IF v_amount < 0 THEN RAISE EXCEPTION 'Monto no válido'; END IF;

  UPDATE lastmile_orders SET
    status           = 'delivered',
    delivered_at     = now(),
    delivered_by     = auth.uid(),
    collected_method = p_method,
    collected_amount = v_amount,
    delivery_notes   = NULLIF(btrim(p_notes), ''),
    updated_at       = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'collected_amount', v_amount);
END;
$$;

-- ------------------------------------------------------------
-- 5c. DEVOLUCIÓN (chofer asignado o admin)
--     Solo un admin reintegra stock, y solo si de verdad salió.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION return_lastmile_order(
  p_order_id UUID,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL,
  p_evidence_url TEXT DEFAULT NULL,
  p_returned_items JSONB DEFAULT NULL,       -- [{product_id, sku, name, quantity_returned}]; NULL = todo
  p_restock BOOLEAN DEFAULT false,
  p_collected_method TEXT DEFAULT NULL,      -- para devoluciones parciales con cobro
  p_collected_amount NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_order    lastmile_orders%ROWTYPE;
  v_is_admin BOOLEAN := lastmile_is_admin();
  v_items    JSONB;
  v_item     JSONB;
  v_ret      JSONB;
  v_qty      INT;
  v_sent     INT;
  v_partial  BOOLEAN := false;
  v_total_returned INT := 0;
  v_restocked INT := 0;
  v_wh_id    UUID;
BEGIN
  SELECT * INTO v_order FROM lastmile_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

  IF NOT (v_is_admin OR (lastmile_is_driver() AND v_order.assigned_driver_id = auth.uid())) THEN
    RAISE EXCEPTION 'No tienes permiso para registrar esta devolución';
  END IF;

  IF v_order.settled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este envío ya fue liquidado';
  END IF;
  IF v_order.restocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'La mercancía de este envío ya fue reintegrada al inventario';
  END IF;
  IF v_order.status NOT IN ('in_transit', 'in_delivery', 'returned', 'partially_returned') THEN
    RAISE EXCEPTION 'Solo se registra devolución de un envío en ruta (estatus: %)', v_order.status;
  END IF;

  -- Normalizar artículos devueltos (por defecto: todo)
  v_items := '[]'::jsonb;
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb))
  LOOP
    CONTINUE WHEN (v_item->>'product_id') IS NULL;
    v_sent := COALESCE((v_item->>'quantity')::INT, 0);
    v_qty := v_sent;

    IF p_returned_items IS NOT NULL THEN
      v_ret := NULL;
      SELECT r INTO v_ret FROM jsonb_array_elements(p_returned_items) r
      WHERE r->>'product_id' = v_item->>'product_id' LIMIT 1;
      v_qty := LEAST(GREATEST(COALESCE((v_ret->>'quantity_returned')::INT, 0), 0), v_sent);
    END IF;

    IF v_qty < v_sent THEN v_partial := true; END IF;
    v_total_returned := v_total_returned + v_qty;

    v_items := v_items || jsonb_build_object(
      'product_id', v_item->>'product_id', 'sku', v_item->>'sku', 'name', v_item->>'name',
      'quantity_sent', v_sent, 'quantity_returned', v_qty
    );
  END LOOP;

  IF v_total_returned = 0 THEN
    RAISE EXCEPTION 'Indica al menos una pieza devuelta';
  END IF;

  -- Reintegro de stock: solo admin, solo si el inventario salió
  IF p_restock AND v_is_admin AND v_order.stock_deducted_at IS NOT NULL THEN
    v_wh_id := COALESCE(v_order.warehouse_id,
                        (SELECT id FROM warehouses WHERE name = v_order.warehouse_name LIMIT 1),
                        (SELECT id FROM warehouses WHERE code = 'vito-alessio'));
    FOR v_ret IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      v_qty := (v_ret->>'quantity_returned')::INT;
      CONTINUE WHEN v_qty <= 0;
      PERFORM adjust_warehouse_stock(
        (v_ret->>'product_id')::UUID, v_wh_id, v_qty,
        'Devolución envío a domicilio - Orden ' || v_order.order_number, auth.uid()
      );
      v_restocked := v_restocked + v_qty;
    END LOOP;
  END IF;

  UPDATE lastmile_orders SET
    status              = CASE WHEN v_partial THEN 'partially_returned' ELSE 'returned' END,
    return_reason       = COALESCE(NULLIF(btrim(p_reason), ''), return_reason, 'otro'),
    return_notes        = COALESCE(NULLIF(btrim(p_notes), ''), return_notes),
    return_evidence_url = COALESCE(NULLIF(btrim(p_evidence_url), ''), return_evidence_url),
    returned_items      = v_items,
    returned_at         = COALESCE(returned_at, now()),
    restocked_at        = CASE WHEN v_restocked > 0 THEN now() ELSE restocked_at END,
    delivered_by        = CASE WHEN v_partial THEN auth.uid() ELSE delivered_by END,
    delivered_at        = CASE WHEN v_partial THEN COALESCE(delivered_at, now()) ELSE delivered_at END,
    collected_method    = CASE WHEN v_partial AND p_collected_method IS NOT NULL THEN p_collected_method ELSE collected_method END,
    collected_amount    = CASE WHEN v_partial AND p_collected_method IS NOT NULL THEN COALESCE(p_collected_amount, 0) ELSE collected_amount END,
    updated_at          = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', CASE WHEN v_partial THEN 'partially_returned' ELSE 'returned' END,
    'restocked_pieces', v_restocked,
    'stock_was_deducted', v_order.stock_deducted_at IS NOT NULL
  );
END;
$$;

-- ------------------------------------------------------------
-- 5d. PAGO ANTICIPADO (solo admin) — si es efectivo, entra a caja ya
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION register_lastmile_prepayment(
  p_order_id UUID,
  p_method TEXT,
  p_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_order  lastmile_orders%ROWTYPE;
  v_amount NUMERIC;
BEGIN
  IF NOT lastmile_is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede registrar pagos';
  END IF;

  SELECT * INTO v_order FROM lastmile_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

  IF v_order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Este pedido ya está pagado';
  END IF;
  IF v_order.status NOT IN ('pending', 'confirmed', 'in_transit', 'in_delivery') THEN
    RAISE EXCEPTION 'El pago anticipado solo aplica antes de la entrega; usa Liquidar ruta';
  END IF;
  IF p_method NOT IN ('cash', 'transfer', 'card') THEN
    RAISE EXCEPTION 'Forma de pago no válida';
  END IF;

  v_amount := COALESCE(p_amount, v_order.total);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Monto no válido'; END IF;

  IF p_method = 'cash' THEN
    INSERT INTO cash_movements (type, amount, concept, responsible, reference_id, reference_type, movement_date, created_by, notes)
    VALUES (
      'entry', v_amount,
      'Envío a domicilio (pago anticipado): ' || v_order.order_number || COALESCE(' — ' || v_order.customer_name, ''),
      COALESCE((SELECT full_name FROM profiles WHERE id = auth.uid()), 'Admin'),
      v_order.id, 'retail_sale',
      (now() AT TIME ZONE 'America/Mexico_City')::date,
      auth.uid(),
      NULLIF(btrim(p_notes), '')
    );
  END IF;

  UPDATE lastmile_orders SET
    payment_status = 'paid',
    payment_method = p_method,
    prepaid_at     = now(),
    prepaid_by     = auth.uid(),
    updated_at     = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'cash_entry', p_method = 'cash', 'amount', v_amount);
END;
$$;

-- ------------------------------------------------------------
-- 5e. LIQUIDAR RUTA (solo admin) — aquí entra el efectivo a caja
--     p_orders: [{ "id": uuid, "amount": numeric (opcional, monto real recibido) }]
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION settle_lastmile_orders(p_orders JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_entry   JSONB;
  v_order   lastmile_orders%ROWTYPE;
  v_amount  NUMERIC;
  v_driver  TEXT;
  v_cash    NUMERIC := 0;
  v_other   NUMERIC := 0;
  v_count   INT := 0;
BEGIN
  IF NOT lastmile_is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede liquidar rutas';
  END IF;

  IF p_orders IS NULL OR jsonb_array_length(p_orders) = 0 THEN
    RAISE EXCEPTION 'Selecciona al menos un envío';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_orders)
  LOOP
    SELECT * INTO v_order FROM lastmile_orders WHERE id = (v_entry->>'id')::UUID FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado: %', v_entry->>'id'; END IF;

    IF v_order.settled_at IS NOT NULL THEN
      RAISE EXCEPTION 'El envío % ya estaba liquidado', v_order.order_number;
    END IF;
    IF v_order.status NOT IN ('delivered', 'partially_returned', 'returned') THEN
      RAISE EXCEPTION 'El envío % todavía no se entrega (estatus: %)', v_order.order_number, v_order.status;
    END IF;

    v_amount := COALESCE((v_entry->>'amount')::NUMERIC, v_order.collected_amount, 0);
    IF v_amount < 0 THEN RAISE EXCEPTION 'Monto no válido en %', v_order.order_number; END IF;

    SELECT full_name INTO v_driver FROM profiles WHERE id = COALESCE(v_order.delivered_by, v_order.assigned_driver_id);

    IF v_order.collected_method = 'cash' AND v_amount > 0 THEN
      INSERT INTO cash_movements (type, amount, concept, responsible, reference_id, reference_type, movement_date, created_by)
      VALUES (
        'entry', v_amount,
        'Envío a domicilio: ' || v_order.order_number || COALESCE(' — ' || v_order.customer_name, ''),
        COALESCE(v_driver, 'Chofer'),
        v_order.id, 'retail_sale',
        (now() AT TIME ZONE 'America/Mexico_City')::date,
        auth.uid()
      );
      v_cash := v_cash + v_amount;
    ELSIF v_order.collected_method IN ('transfer', 'card') THEN
      v_other := v_other + v_amount;
    END IF;

    UPDATE lastmile_orders SET
      collected_amount = CASE WHEN collected_method IN ('cash', 'transfer', 'card') THEN v_amount ELSE collected_amount END,
      payment_status   = CASE
                           WHEN collected_method IN ('cash', 'transfer', 'card') AND v_amount > 0 THEN 'paid'
                           ELSE payment_status
                         END,
      payment_method   = CASE WHEN collected_method IN ('cash', 'transfer', 'card') THEN collected_method ELSE payment_method END,
      settled_at       = now(),
      settled_by       = auth.uid(),
      updated_at       = now()
    WHERE id = v_order.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'settled', v_count, 'cash_total', v_cash, 'non_cash_total', v_other);
END;
$$;

GRANT EXECUTE ON FUNCTION dispatch_lastmile_order(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_lastmile_delivered(UUID, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION return_lastmile_order(UUID, TEXT, TEXT, TEXT, JSONB, BOOLEAN, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION register_lastmile_prepayment(UUID, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION settle_lastmile_orders(JSONB) TO authenticated;

-- ------------------------------------------------------------
-- 6. RESPALDO — envíos creados con la versión anterior de create_retail_sale
--    (esa versión descontaba inventario al crear el link)
-- ------------------------------------------------------------
UPDATE lastmile_orders lo SET
  warehouse_id = COALESCE(lo.warehouse_id, (SELECT w.id FROM warehouses w WHERE w.name = lo.warehouse_name LIMIT 1))
WHERE lo.warehouse_id IS NULL AND lo.warehouse_name IS NOT NULL;

UPDATE lastmile_orders lo SET stock_deducted_at = lo.created_at
WHERE lo.stock_deducted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM inventory_logs il
    WHERE il.reason LIKE 'Venta a público - Orden ' || lo.order_number || ' %'
  );

-- Revisión: envíos activos y si ya descontaron inventario
SELECT order_number, delivery_type, status, warehouse_name,
       stock_deducted_at IS NOT NULL AS inventario_ya_descontado,
       jsonb_array_length(COALESCE(items, '[]'::jsonb)) AS partidas,
       (SELECT count(*) FROM inventory_logs il WHERE il.reason LIKE 'Venta a público - Orden ' || lo.order_number || ' %') AS partidas_descontadas
FROM lastmile_orders lo
WHERE delivery_type = 'delivery' AND status NOT IN ('cancelled', 'delivered', 'returned')
ORDER BY created_at DESC;
