BEGIN;
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
    IF v_existing_sale.warehouse_id IS DISTINCT FROM p_warehouse_id
       OR v_existing_sale.sold_by IS DISTINCT FROM v_actor_id
       OR v_existing_sale.items IS DISTINCT FROM p_items
       OR v_existing_sale.subtotal IS DISTINCT FROM p_subtotal
       OR v_existing_sale.total IS DISTINCT FROM p_total
       OR v_existing_sale.payment_method IS DISTINCT FROM p_payment_method
       OR v_existing_sale.customer_name IS DISTINCT FROM COALESCE(NULLIF(btrim(p_customer_name), ''), 'Público General')
       OR v_existing_sale.amount_received IS DISTINCT FROM p_amount_received
       OR v_existing_sale.notes IS DISTINCT FROM p_notes THEN
      RETURN jsonb_build_object('success',false,'error','Este folio ya pertenece a otra venta. Recarga el portal y vuelve a intentar.');
    END IF;
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
CREATE TABLE public.document_folio_counters (
 kind text NOT NULL CHECK(kind IN ('quotation','counter_sale')),period text NOT NULL,
 last_number bigint NOT NULL CHECK(last_number>=0),PRIMARY KEY(kind,period)
);
ALTER TABLE public.document_folio_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_folio_counters FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.document_folio_counters TO service_role;

CREATE FUNCTION public.allocate_document_folio(p_kind text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE period_key text; prefix text; baseline bigint; allocated bigint;
BEGIN
 IF p_kind='quotation' THEN
  period_key:=to_char(now() AT TIME ZONE 'America/Mexico_City','YYYY');prefix:='COT-'||period_key||'-';
  SELECT coalesce(max(substr(folio,length(prefix)+1)::bigint),200) INTO baseline FROM public.quotations WHERE folio ~ ('^'||prefix||'[0-9]+$');
 ELSIF p_kind='counter_sale' THEN
  period_key:=to_char(now() AT TIME ZONE 'America/Mexico_City','YYMMDD');prefix:='VMP-'||period_key||'-';
  SELECT coalesce(max(substr(sale_number,length(prefix)+1)::bigint),0) INTO baseline FROM public.counter_sales WHERE sale_number ~ ('^'||prefix||'[0-9]+$');
 ELSE RAISE EXCEPTION 'Tipo de folio inválido.'; END IF;
 INSERT INTO public.document_folio_counters AS counters(kind,period,last_number) VALUES(p_kind,period_key,baseline+1)
 ON CONFLICT(kind,period) DO UPDATE SET last_number=greatest(counters.last_number,baseline)+1 RETURNING last_number INTO allocated;
 RETURN prefix||lpad(allocated::text,greatest(3,length(allocated::text)),'0');
END $$;
REVOKE ALL ON FUNCTION public.allocate_document_folio(text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.generate_quotation_folio() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND is_active IS TRUE) THEN
  RAISE EXCEPTION 'Solo administradores activos pueden generar folios de cotización.' USING ERRCODE='42501';
 END IF;
 RETURN public.allocate_document_folio('quotation');
END $$;
REVOKE ALL ON FUNCTION public.generate_quotation_folio() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.generate_quotation_folio() TO authenticated,service_role;

CREATE TABLE public.counter_sale_requests(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id),payload jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.counter_sale_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.counter_sale_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.counter_sale_requests TO service_role;

CREATE FUNCTION public.create_counter_sale_with_folio(p_request_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior public.counter_sale_requests%ROWTYPE; payload jsonb:=p_payload-'seller_code'; result jsonb; folio text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_manage_inventory() THEN RAISE EXCEPTION 'No tienes permisos para registrar ventas en mostrador.'; END IF;
 IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Solicitud inválida.'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('counter-sale:'||p_request_id::text,0));
 SELECT * INTO prior FROM public.counter_sale_requests WHERE id=p_request_id;
 IF FOUND THEN
  IF prior.user_id IS DISTINCT FROM auth.uid() OR prior.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'El identificador corresponde a otra venta.'; END IF;
  RETURN prior.result||jsonb_build_object('idempotent',true);
 END IF;
 folio:=public.allocate_document_folio('counter_sale');
 result:=public.create_counter_sale_atomic(folio,(p_payload->>'warehouse_id')::uuid,(p_payload->>'sold_by')::uuid,p_payload->>'seller_name',p_payload->>'customer_name',p_payload->>'payment_method',(p_payload->>'subtotal')::numeric,(p_payload->>'total')::numeric,(p_payload->>'amount_received')::numeric,p_payload->>'notes',p_payload->'items',p_payload->>'seller_code');
 IF coalesce((result->>'success')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION '%',coalesce(result->>'error','No se pudo registrar la venta.'); END IF;
 INSERT INTO public.counter_sale_requests(id,user_id,payload,result) VALUES(p_request_id,auth.uid(),payload,result);
 RETURN result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error',SQLERRM);
END $$;
REVOKE ALL ON FUNCTION public.create_counter_sale_with_folio(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_counter_sale_with_folio(uuid,jsonb) TO authenticated,service_role;
COMMIT;
