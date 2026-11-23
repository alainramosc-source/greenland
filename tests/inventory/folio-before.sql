CREATE OR REPLACE FUNCTION public.create_counter_sale_atomic(p_sale_number text, p_warehouse_id uuid, p_sold_by uuid, p_seller_name text, p_customer_name text, p_payment_method text, p_subtotal numeric, p_total numeric, p_amount_received numeric, p_notes text, p_items jsonb, p_seller_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
