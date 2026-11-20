BEGIN;

-- Acquire the product row before evaluating aggregates. This retains the same
-- lock order as the existing trigger while avoiding a stale SUM after a wait.
CREATE OR REPLACE FUNCTION public.sync_product_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid:=coalesce(NEW.product_id,OLD.product_id);
BEGIN
 PERFORM 1 FROM public.products WHERE id=pid FOR NO KEY UPDATE;
 UPDATE public.products SET stock_quantity=(SELECT coalesce(sum(stock_quantity),0) FROM public.warehouse_stock WHERE product_id=pid),
   reserved_quantity=(SELECT coalesce(sum(reserved_quantity),0) FROM public.warehouse_stock WHERE product_id=pid) WHERE id=pid;
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.sync_product_stock() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_inventory() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'
   AND is_active IS TRUE AND sub_role IN ('super_admin','admin','warehouse_admin'));
$$;
REVOKE ALL ON FUNCTION public.can_manage_inventory() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_manage_inventory() TO authenticated,service_role;

-- Invoker, deliberately: trusted definer parents retain internal stock access;
-- direct client calls must pass the active inventory role check.
CREATE OR REPLACE FUNCTION public.inventory_trusted_role() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT rolsuper OR rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user;
$$;
REVOKE ALL ON FUNCTION public.inventory_trusted_role() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.inventory_trusted_role() TO authenticated,service_role;

CREATE TABLE public.inventory_operation_requests (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.profiles(id),
 kind text NOT NULL CHECK(kind IN ('adjust','transfer','count_save')), payload jsonb NOT NULL,
 result jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_operation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_operation_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.inventory_operation_requests TO service_role;

CREATE OR REPLACE FUNCTION public.apply_inventory_operation(p_request_id uuid,p_kind text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 uid uuid:=auth.uid(); actor public.profiles%ROWTYPE; prior public.inventory_operation_requests%ROWTYPE;
 items jsonb; line jsonb; pid uuid; wh uuid; origin uuid; destination uuid; qty integer; delta integer;
 before_qty integer; reserved integer; expected integer; reason text; v_result jsonb; child jsonb;
 credit numeric; pro_id uuid; pro_count integer; receipt uuid; credit_ids jsonb:='[]';
 from_name text; to_name text; sku text; product_name text; processed integer:=0;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado.'; END IF;
 SELECT * INTO actor FROM public.profiles WHERE id=uid;
 IF NOT FOUND OR actor.is_active IS NOT TRUE THEN RAISE EXCEPTION 'Perfil inactivo o inexistente.'; END IF;
 IF p_request_id IS NULL OR p_kind NOT IN ('adjust','transfer') OR p_payload IS NULL THEN RAISE EXCEPTION 'Solicitud inválida.'; END IF;
 IF NOT public.can_manage_inventory() AND NOT (p_kind='transfer' AND actor.role='distributor' AND actor.sub_role='distributor_pro') THEN
   RAISE EXCEPTION 'Tu cargo no permite esta operación de inventario.';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('inventory-request:'||p_request_id::text,0));
 SELECT * INTO prior FROM public.inventory_operation_requests WHERE id=p_request_id;
 IF FOUND THEN
   IF prior.user_id<>uid OR prior.kind<>p_kind OR prior.payload<>p_payload THEN RAISE EXCEPTION 'El identificador ya pertenece a otra solicitud.'; END IF;
   RETURN prior.result||jsonb_build_object('replayed',true);
 END IF;
 items:=p_payload->'items';
 IF jsonb_typeof(items) IS DISTINCT FROM 'array' OR jsonb_array_length(items) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Incluye entre 1 y 2000 partidas válidas.'; END IF;
 IF p_kind='transfer' THEN
   origin:=(p_payload->>'from_warehouse_id')::uuid; destination:=(p_payload->>'to_warehouse_id')::uuid;
   IF origin IS NULL OR destination IS NULL OR origin=destination THEN RAISE EXCEPTION 'Selecciona dos bodegas diferentes.'; END IF;
   IF actor.role='distributor' AND actor.assigned_warehouse_id IS DISTINCT FROM origin THEN RAISE EXCEPTION 'Solo puedes transferir desde tu bodega asignada.'; END IF;
   SELECT name INTO from_name FROM public.warehouses WHERE id=origin AND is_active IS TRUE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Bodega de origen no disponible.'; END IF;
   SELECT name INTO to_name FROM public.warehouses WHERE id=destination AND is_active IS TRUE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Bodega de destino no disponible.'; END IF;
   SELECT count(*),(array_agg(id ORDER BY id))[1] INTO pro_count,pro_id FROM public.profiles
     WHERE role='distributor' AND sub_role='distributor_pro' AND assigned_warehouse_id=origin AND is_active IS TRUE;
 END IF;
 -- Validate the complete request before stock/log/credit writes.
 FOR line IN SELECT value FROM jsonb_array_elements(items) LOOP
   pid:=(line->>'product_id')::uuid;
   IF pid IS NULL OR NOT EXISTS(SELECT 1 FROM public.products WHERE id=pid AND is_active IS TRUE) THEN RAISE EXCEPTION 'Producto inexistente o inactivo.'; END IF;
   IF p_kind='adjust' THEN
     wh:=(line->>'warehouse_id')::uuid;
     IF wh IS NULL OR NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=wh AND is_active IS TRUE) THEN RAISE EXCEPTION 'Bodega no disponible.'; END IF;
     IF coalesce(line->>'type','') NOT IN ('ADD','SUB','SET','DELTA') OR coalesce(line->>'quantity','') !~ '^-?[0-9]+$' THEN RAISE EXCEPTION 'Cantidad o tipo de ajuste inválido.'; END IF;
     qty:=(line->>'quantity')::integer;
     IF line->>'type'<>'DELTA' AND qty<0 THEN RAISE EXCEPTION 'La cantidad debe ser un entero no negativo.'; END IF;
     IF line ? 'expected_stock' AND coalesce(line->>'expected_stock','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Base de inventario inválida.'; END IF;
   ELSE
     IF coalesce(line->>'quantity','') !~ '^[0-9]+$' OR (line->>'quantity')::integer<=0 THEN RAISE EXCEPTION 'La transferencia requiere cantidades enteras positivas.'; END IF;
     credit:=coalesce((line->>'credit')::numeric,0);
     IF credit<0 OR credit::text IN ('NaN','Infinity','-Infinity') OR credit<>round(credit,2) THEN RAISE EXCEPTION 'El crédito debe ser un importe no negativo con máximo dos decimales.'; END IF;
     IF credit>0 AND (NOT public.can_manage_inventory() OR pro_count<>1) THEN RAISE EXCEPTION 'El crédito requiere un administrador autorizado y un único PRO activo en origen.'; END IF;
   END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(items) x GROUP BY x->>'product_id',CASE WHEN p_kind='adjust' THEN x->>'warehouse_id' ELSE '' END HAVING count(*)>1) THEN
   RAISE EXCEPTION 'Hay partidas repetidas para el mismo producto y bodega.';
 END IF;
 INSERT INTO public.inventory_operation_requests(id,user_id,kind,payload) VALUES(p_request_id,uid,p_kind,p_payload);
 -- Precreate zero rows and acquire all warehouse rows in a stable order.
 INSERT INTO public.warehouse_stock(product_id,warehouse_id,stock_quantity,reserved_quantity)
 SELECT (x->>'product_id')::uuid,w.id,0,0 FROM jsonb_array_elements(items) x
 CROSS JOIN LATERAL (SELECT (x->>'warehouse_id')::uuid AS id WHERE p_kind='adjust'
   UNION ALL SELECT origin WHERE p_kind='transfer' UNION ALL SELECT destination WHERE p_kind='transfer') w
 ORDER BY (x->>'product_id')::uuid,w.id ON CONFLICT(warehouse_id,product_id) DO NOTHING;
 PERFORM 1 FROM public.warehouse_stock s WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(items) x
   WHERE s.product_id=(x->>'product_id')::uuid AND ((p_kind='adjust' AND s.warehouse_id=(x->>'warehouse_id')::uuid)
   OR (p_kind='transfer' AND s.warehouse_id IN(origin,destination)))) ORDER BY s.product_id,s.warehouse_id FOR UPDATE;
 FOR line IN SELECT value FROM jsonb_array_elements(items) ORDER BY value->>'product_id',value->>'warehouse_id' LOOP
   pid:=(line->>'product_id')::uuid;
   SELECT p.sku,p.name INTO sku,product_name FROM public.products p WHERE p.id=pid;
   IF p_kind='adjust' THEN
     wh:=(line->>'warehouse_id')::uuid; qty:=(line->>'quantity')::integer;
     SELECT stock_quantity,coalesce(reserved_quantity,0) INTO before_qty,reserved FROM public.warehouse_stock WHERE product_id=pid AND warehouse_id=wh;
     IF line ? 'expected_stock' AND before_qty<>(line->>'expected_stock')::integer THEN RAISE EXCEPTION 'El stock de % cambió. Actualiza la vista o el CSV antes de aplicar.',sku; END IF;
     delta:=CASE line->>'type' WHEN 'SET' THEN qty-before_qty WHEN 'SUB' THEN -qty ELSE qty END;
     IF before_qty+delta<reserved OR before_qty+delta<0 THEN RAISE EXCEPTION 'Stock disponible insuficiente para %. Hay % piezas reservadas.',sku,reserved; END IF;
     IF delta<>0 THEN
       child:=public.adjust_warehouse_stock_atomic(pid,wh,delta,coalesce(nullif(p_payload->>'reason',''),'Ajuste manual'),uid);
       IF child->>'success' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION '%',coalesce(child->>'error','No se pudo aplicar el ajuste.'); END IF;
     END IF;
   ELSE
     qty:=(line->>'quantity')::integer; credit:=coalesce((line->>'credit')::numeric,0);
     child:=public.transfer_stock(pid,origin,destination,qty,uid);
     IF child->>'success' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION '%: %',sku,coalesce(child->>'error','No se pudo transferir la partida.'); END IF;
     IF credit>0 THEN
       INSERT INTO public.container_receptions(distributor_id,warehouse_id,reception_date,container_label,charge_amount,total_origin_cost,total_additional_costs,total_landed_cost,status,notes,created_by)
       VALUES(pro_id,origin,(now() AT TIME ZONE 'America/Mexico_City')::date,'Traspaso '||from_name||' → '||to_name,-credit,0,0,0,'completed',
         format('Crédito por traspaso de %s pzas de %s (%s) de %s a %s. Operación %s',qty,sku,product_name,from_name,to_name,p_request_id),uid) RETURNING id INTO receipt;
       INSERT INTO public.container_reception_items(reception_id,product_id,quantity,unit_origin_cost,unit_landed_cost,unit_pro_price,warehouse_id)
         VALUES(receipt,pid,qty,0,0,round(credit/qty,2),origin);
       credit_ids:=credit_ids||jsonb_build_array(receipt);
     END IF;
   END IF;
   processed:=processed+1;
 END LOOP;
 v_result:=jsonb_build_object('success',true,'request_id',p_request_id,'processed',processed,'credits',credit_ids);
 UPDATE public.inventory_operation_requests SET result=v_result WHERE id=p_request_id;
 RETURN v_result;
EXCEPTION WHEN OTHERS THEN
 RETURN jsonb_build_object('success',false,'error',CASE WHEN SQLSTATE='P0001' THEN SQLERRM ELSE 'No se aplicó ningún cambio. Revisa las partidas e intenta de nuevo.' END,'code',SQLSTATE);
END $$;
REVOKE ALL ON FUNCTION public.apply_inventory_operation(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_inventory_operation(uuid,text,jsonb) TO authenticated;

-- Count lifecycle guards apply to direct clients; trusted RPCs do their own checks.
CREATE OR REPLACE FUNCTION public.guard_inventory_count_edit() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE parent public.inventory_count_sessions%ROWTYPE;
BEGIN
 IF public.inventory_trusted_role() THEN RETURN coalesce(NEW,OLD); END IF;
 IF NOT public.can_manage_inventory() THEN RAISE EXCEPTION 'Tu cargo no permite modificar conteos.' USING ERRCODE='42501'; END IF;
 IF TG_TABLE_NAME='inventory_count_sessions' THEN
   IF TG_OP<>'UPDATE' OR OLD.status NOT IN ('draft','in_progress') THEN RAISE EXCEPTION 'El conteo está cerrado para edición.'; END IF;
   IF NEW.status IS DISTINCT FROM OLD.status AND NOT(OLD.status='draft' AND NEW.status='in_progress') THEN RAISE EXCEPTION 'Usa el flujo de revisión del conteo.'; END IF;
   IF (to_jsonb(NEW)-ARRAY['notes','responsible_user_id','supervisor_user_id','status','started_at']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['notes','responsible_user_id','supervisor_user_id','status','started_at']) THEN RAISE EXCEPTION 'No puedes alterar la identidad, base o aprobación del conteo.'; END IF;
 ELSE
   SELECT * INTO parent FROM public.inventory_count_sessions WHERE id=coalesce(NEW.session_id,OLD.session_id) FOR UPDATE;
   IF NOT FOUND OR parent.status NOT IN ('draft','in_progress') THEN RAISE EXCEPTION 'El conteo está cerrado para edición.'; END IF;
   IF TG_OP='UPDATE' AND (NEW.id,NEW.session_id,NEW.product_id,NEW.sku,NEW.qty_system_snapshot) IS DISTINCT FROM (OLD.id,OLD.session_id,OLD.product_id,OLD.sku,OLD.qty_system_snapshot) THEN RAISE EXCEPTION 'No puedes alterar la base de la partida.'; END IF;
   IF TG_OP<>'DELETE' THEN
     IF NEW.qty_counted<0 THEN RAISE EXCEPTION 'El conteo no puede ser negativo.'; END IF;
     IF TG_OP='INSERT' OR NEW.qty_counted IS DISTINCT FROM OLD.qty_counted THEN
       SELECT sku INTO NEW.sku FROM public.products WHERE id=NEW.product_id;
       SELECT coalesce(stock_quantity,0) INTO NEW.qty_system_snapshot FROM public.warehouse_stock WHERE product_id=NEW.product_id AND warehouse_id=parent.warehouse_id;
       NEW.qty_system_snapshot:=coalesce(NEW.qty_system_snapshot,0);
       NEW.counted_by:=CASE WHEN NEW.qty_counted IS NOT NULL THEN auth.uid() ELSE NULL END; NEW.counted_at:=CASE WHEN NEW.qty_counted IS NOT NULL THEN now() ELSE NULL END;
     ELSIF TG_OP='UPDATE' THEN
       NEW.counted_by:=OLD.counted_by; NEW.counted_at:=OLD.counted_at;
     END IF;
   END IF;
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.guard_inventory_count_edit() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_guard_count_header BEFORE INSERT OR UPDATE OR DELETE ON public.inventory_count_sessions FOR EACH ROW EXECUTE FUNCTION public.guard_inventory_count_edit();
CREATE TRIGGER trg_guard_count_line BEFORE INSERT OR UPDATE OR DELETE ON public.inventory_count_lines FOR EACH ROW EXECUTE FUNCTION public.guard_inventory_count_edit();

CREATE UNIQUE INDEX inventory_count_one_product ON public.inventory_count_lines(session_id,product_id);
CREATE UNIQUE INDEX inventory_adjustment_once ON public.inventory_adjustments(session_id,product_id);
CREATE INDEX inventory_active_freeze ON public.inventory_count_sessions(warehouse_id,id)
WHERE freeze_inventory IS TRUE AND status IN ('draft','in_progress','submitted','approved');

CREATE OR REPLACE FUNCTION public.save_inventory_count_lines(p_request_id uuid,p_session_id uuid,p_lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE header public.inventory_count_sessions%ROWTYPE; line jsonb; existing public.inventory_count_lines%ROWTYPE; snapshot integer; qty integer; captured integer:=0;
 prior public.inventory_operation_requests%ROWTYPE; payload jsonb:=jsonb_build_object('session_id',p_session_id,'lines',p_lines); saved_result jsonb;
BEGIN
 IF NOT public.can_manage_inventory() THEN RAISE EXCEPTION 'Tu cargo no permite capturar conteos.'; END IF;
 IF p_request_id IS NULL THEN RAISE EXCEPTION 'Solicitud de guardado inválida.'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('inventory-request:'||p_request_id::text,0));
 SELECT * INTO prior FROM public.inventory_operation_requests WHERE id=p_request_id;
 IF FOUND THEN
   IF prior.user_id<>auth.uid() OR prior.kind<>'count_save' OR prior.payload<>payload THEN RAISE EXCEPTION 'El identificador ya pertenece a otra solicitud.'; END IF;
   RETURN prior.result||jsonb_build_object('replayed',true);
 END IF;
 SELECT * INTO header FROM public.inventory_count_sessions WHERE id=p_session_id FOR UPDATE;
 IF NOT FOUND OR header.status NOT IN ('draft','in_progress') THEN RAISE EXCEPTION 'El conteo está cerrado para edición.'; END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Partidas inválidas.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x GROUP BY x->>'id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Hay partidas repetidas.'; END IF;
 INSERT INTO public.inventory_operation_requests(id,user_id,kind,payload) VALUES(p_request_id,auth.uid(),'count_save',payload);
 FOR line IN SELECT value FROM jsonb_array_elements(p_lines) ORDER BY value->>'id' LOOP
   SELECT * INTO existing FROM public.inventory_count_lines WHERE id=(line->>'id')::uuid AND session_id=p_session_id FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'La partida no pertenece al conteo.'; END IF;
   IF line->>'qty_counted' IS NOT NULL AND line->>'qty_counted' !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Captura cantidades enteras no negativas.'; END IF;
   qty:=(line->>'qty_counted')::integer;
   snapshot:=existing.qty_system_snapshot;
   IF coalesce((line->>'recapture')::boolean,false) THEN
     INSERT INTO public.warehouse_stock(product_id,warehouse_id,stock_quantity,reserved_quantity) VALUES(existing.product_id,header.warehouse_id,0,0) ON CONFLICT(warehouse_id,product_id) DO NOTHING;
     SELECT stock_quantity INTO snapshot FROM public.warehouse_stock WHERE product_id=existing.product_id AND warehouse_id=header.warehouse_id FOR UPDATE;
   ELSIF qty IS DISTINCT FROM existing.qty_counted THEN RAISE EXCEPTION 'La captura cambió. Actualiza el conteo antes de guardar.';
   END IF;
   UPDATE public.inventory_count_lines SET qty_counted=qty,reason=nullif(line->>'reason',''),qty_system_snapshot=snapshot,
     counted_by=CASE WHEN coalesce((line->>'recapture')::boolean,false) THEN auth.uid() ELSE existing.counted_by END,
     counted_at=CASE WHEN coalesce((line->>'recapture')::boolean,false) THEN now() ELSE existing.counted_at END WHERE id=existing.id;
   captured:=captured+1;
 END LOOP;
 UPDATE public.inventory_count_sessions SET status='in_progress',started_at=coalesce(started_at,now()) WHERE id=p_session_id;
 saved_result:=jsonb_build_object('success',true,'saved',captured);
 UPDATE public.inventory_operation_requests SET result=saved_result WHERE id=p_request_id;
 RETURN saved_result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error',CASE WHEN SQLSTATE='P0001' THEN SQLERRM ELSE 'No se guardaron cambios. Revisa las cantidades.' END); END $$;
REVOKE ALL ON FUNCTION public.save_inventory_count_lines(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_inventory_count_lines(uuid,uuid,jsonb) TO authenticated;

-- The adapted existing RPCs and permission policies follow below.
CREATE OR REPLACE FUNCTION public.enforce_inventory_count_freeze() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE wh uuid; frozen uuid; posting text:=current_setting('app.inventory_count_post_session',true);
BEGIN
 IF TG_OP='UPDATE' AND (NEW.stock_quantity,NEW.reserved_quantity,NEW.warehouse_id) IS NOT DISTINCT FROM (OLD.stock_quantity,OLD.reserved_quantity,OLD.warehouse_id) THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' AND coalesce(NEW.stock_quantity,0)=0 AND coalesce(NEW.reserved_quantity,0)=0 THEN RETURN NEW; END IF;
 FOR wh IN SELECT DISTINCT x FROM unnest(ARRAY[CASE WHEN TG_OP<>'DELETE' THEN NEW.warehouse_id END,CASE WHEN TG_OP<>'INSERT' THEN OLD.warehouse_id END])x WHERE x IS NOT NULL ORDER BY x LOOP
   PERFORM pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtextextended('inventory-freeze:'||wh::text,0));
   SELECT id INTO frozen FROM public.inventory_count_sessions WHERE warehouse_id=wh AND freeze_inventory IS TRUE AND status IN ('draft','in_progress','submitted','approved') ORDER BY id LIMIT 1;
   IF FOUND AND NOT coalesce(posting=frozen::text AND public.can_manage_inventory(),false) THEN
     RAISE EXCEPTION 'La bodega tiene un conteo con inventario congelado. Termina o revisa ese conteo antes de mover existencias.';
   END IF;
 END LOOP;
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.enforce_inventory_count_freeze() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_inventory_count_freeze BEFORE INSERT OR UPDATE OR DELETE ON public.warehouse_stock
FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_count_freeze();
CREATE OR REPLACE FUNCTION public.adjust_warehouse_stock(p_product_id uuid, p_warehouse_id uuid, p_quantity_change integer, p_reason text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_qty_before INT;
  v_qty_after INT;
  v_sku TEXT;
  v_wh_name TEXT;
  v_reserved INT;
  v_trusted BOOLEAN := public.inventory_trusted_role();
BEGIN
  IF NOT v_trusted AND NOT public.can_manage_inventory() THEN RAISE EXCEPTION 'No tienes permiso para ajustar inventario.' USING ERRCODE='42501'; END IF;
  IF p_quantity_change IS NULL THEN RAISE EXCEPTION 'Cantidad inválida.'; END IF;
  INSERT INTO public.warehouse_stock(warehouse_id,product_id,stock_quantity,reserved_quantity) VALUES(p_warehouse_id,p_product_id,0,0) ON CONFLICT(warehouse_id,product_id) DO NOTHING;
  SELECT COALESCE(stock_quantity, 0),COALESCE(reserved_quantity,0) INTO v_qty_before,v_reserved
  FROM warehouse_stock
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id FOR UPDATE;

  IF v_qty_before IS NULL THEN
    v_qty_before := 0;
  END IF;

  IF NOT v_trusted AND v_qty_before+p_quantity_change<v_reserved THEN RAISE EXCEPTION 'Stock insuficiente o reservado.'; END IF;
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
    COALESCE(auth.uid(),p_created_by),
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


CREATE OR REPLACE FUNCTION public.create_count_session(p_warehouse_id uuid, p_count_type text, p_responsible_user_id uuid, p_notes text DEFAULT NULL::text, p_freeze boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_session_id UUID;
    v_session_code TEXT;
    v_product RECORD;
BEGIN
    IF NOT public.can_manage_inventory() THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    IF p_count_type IS NULL OR p_count_type NOT IN ('full','partial','free') THEN RAISE EXCEPTION 'Tipo de conteo inválido.'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=p_warehouse_id AND is_active IS TRUE) THEN RAISE EXCEPTION 'Bodega no disponible.'; END IF;
    IF p_freeze THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('inventory-freeze:'||p_warehouse_id::text,0));
      IF EXISTS(SELECT 1 FROM public.inventory_count_sessions WHERE warehouse_id=p_warehouse_id AND freeze_inventory AND status<>'posted') THEN RAISE EXCEPTION 'Ya existe un conteo congelado en esta bodega.'; END IF;
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
    SELECT * INTO v_session FROM inventory_count_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sesión no encontrada');
    END IF;

    -- Verify admin
    IF NOT public.can_manage_inventory() THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    IF p_action='unfreeze' THEN
      IF v_session.status='posted' OR v_session.freeze_inventory IS NOT TRUE THEN RAISE EXCEPTION 'No hay un congelamiento activo que retirar.'; END IF;
      UPDATE public.inventory_count_sessions SET freeze_inventory=false WHERE id=p_session_id;
      INSERT INTO public.audit_log(user_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'count_unfrozen','inventory_count',p_session_id,jsonb_build_object('session_code',v_session.session_code));
      RETURN jsonb_build_object('success',true,'new_status',v_session.status);
    END IF;
    IF p_action='reopen' THEN
      IF v_session.status NOT IN ('submitted','approved') THEN RAISE EXCEPTION 'Solo puedes reabrir un conteo pendiente de aplicar.'; END IF;
      UPDATE public.inventory_count_sessions SET status='in_progress',submitted_at=NULL,submitted_by=NULL,approved_at=NULL,approved_by=NULL WHERE id=p_session_id;
      INSERT INTO public.audit_log(user_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'count_reopened','inventory_count',p_session_id,jsonb_build_object('session_code',v_session.session_code));
      RETURN jsonb_build_object('success',true,'new_status','in_progress');
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
        IF v_session.status='posted' THEN RETURN jsonb_build_object('success',true,'new_status','posted','replayed',true); END IF;
        IF v_session.status != 'approved' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Solo se puede aplicar desde estado aprobado');
        END IF;

        INSERT INTO public.warehouse_stock(product_id,warehouse_id,stock_quantity,reserved_quantity)
        SELECT product_id,v_session.warehouse_id,0,0 FROM public.inventory_count_lines WHERE session_id=p_session_id AND qty_counted IS NOT NULL ORDER BY product_id
        ON CONFLICT(warehouse_id,product_id) DO NOTHING;
        PERFORM 1 FROM public.warehouse_stock s WHERE s.warehouse_id=v_session.warehouse_id AND s.product_id IN(SELECT product_id FROM public.inventory_count_lines WHERE session_id=p_session_id AND qty_counted IS NOT NULL) ORDER BY s.product_id FOR UPDATE;
        FOR v_line IN SELECT l.*,s.stock_quantity,s.reserved_quantity FROM public.inventory_count_lines l JOIN public.warehouse_stock s ON s.product_id=l.product_id AND s.warehouse_id=v_session.warehouse_id WHERE l.session_id=p_session_id AND l.qty_counted IS NOT NULL ORDER BY l.product_id LOOP
          IF v_line.qty_counted<0 THEN RAISE EXCEPTION 'El conteo no puede ser negativo.'; END IF;
          IF v_line.stock_quantity<>v_line.qty_system_snapshot THEN RAISE EXCEPTION 'Hubo movimientos en %. Vuelve al conteo y recaptura físicamente esa partida.',v_line.sku; END IF;
          IF v_line.stock_quantity+v_line.qty_counted-v_line.qty_system_snapshot<coalesce(v_line.reserved_quantity,0) THEN RAISE EXCEPTION 'El conteo de % dejaría stock por debajo de lo reservado.',v_line.sku; END IF;
        END LOOP;
        PERFORM set_config('app.inventory_count_post_session',p_session_id::text,true);

        -- Process each line with a difference
        FOR v_line IN
            SELECT cl.*, p.sku as product_sku
            FROM inventory_count_lines cl
            JOIN products p ON p.id = cl.product_id
            WHERE cl.session_id = p_session_id
              AND cl.qty_counted IS NOT NULL
              AND cl.qty_counted != cl.qty_system_snapshot
            ORDER BY cl.product_id
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

            -- trg_sync_product_stock updates the global total exactly once.
            INSERT INTO public.inventory_logs(user_id,product_id,quantity_change,reason)
            VALUES(auth.uid(),v_line.product_id,v_adjustment,format('Conteo %s: %s [Bodega: %s]',v_session.session_code,coalesce(v_line.reason,''),v_session.warehouse_id));
        END LOOP;

        PERFORM set_config('app.inventory_count_post_session','',true);
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
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success',false,'error',CASE WHEN SQLSTATE='P0001' THEN SQLERRM ELSE 'No se aplicó el conteo. Revisa los datos e intenta de nuevo.' END,'code',SQLSTATE);
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
    IF NOT public.can_manage_inventory() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('inventory-count-code',0));
    v_year := TO_CHAR(now(), 'YYYY');
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(session_code, '-', 3) AS INT)
    ), 0) + 1
    INTO v_seq
    FROM inventory_count_sessions
    WHERE session_code LIKE 'CNT-' || v_year || '-%';

    RETURN 'CNT-' || v_year || '-' || LPAD(v_seq::TEXT, GREATEST(3,length(v_seq::TEXT)), '0');
END;
$function$;



REVOKE ALL ON FUNCTION public.adjust_warehouse_stock(uuid,uuid,integer,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.adjust_warehouse_stock(uuid,uuid,integer,text,uuid) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.advance_count_session(uuid,text),public.create_count_session(uuid,text,uuid,text,boolean),public.generate_count_session_code() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.advance_count_session(uuid,text),public.create_count_session(uuid,text,uuid,text,boolean),public.generate_count_session_code() TO authenticated;
DO $$
DECLARE t text; p record;
BEGIN
 FOREACH t IN ARRAY ARRAY['inventory_count_sessions','inventory_count_lines','inventory_adjustments'] LOOP
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t); END LOOP;
  EXECUTE format('CREATE POLICY inventory_admin_read ON public.%I FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role=''admin'' AND is_active IS TRUE))',t);
 END LOOP;
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='warehouse_stock' AND cmd IN('ALL','INSERT','UPDATE','DELETE') LOOP EXECUTE format('DROP POLICY %I ON public.warehouse_stock',p.policyname); END LOOP;
END $$;
CREATE POLICY inventory_stock_write ON public.warehouse_stock FOR ALL TO authenticated USING(public.can_manage_inventory()) WITH CHECK(public.can_manage_inventory());
CREATE POLICY inventory_header_edit ON public.inventory_count_sessions FOR UPDATE TO authenticated USING(public.can_manage_inventory()) WITH CHECK(public.can_manage_inventory());
CREATE POLICY inventory_line_edit ON public.inventory_count_lines FOR ALL TO authenticated USING(public.can_manage_inventory()) WITH CHECK(public.can_manage_inventory());
REVOKE INSERT,DELETE ON public.inventory_count_sessions FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.inventory_adjustments FROM authenticated;
REVOKE TRUNCATE,TRIGGER,REFERENCES ON public.warehouse_stock,public.inventory_count_sessions,public.inventory_count_lines,public.inventory_adjustments,public.audit_log,public.inventory_logs FROM PUBLIC,anon,authenticated;
COMMIT;
