BEGIN;

-- Additive fields: old clients keep working until the reception screen is deployed.
ALTER TABLE public.container_receptions
  ADD COLUMN IF NOT EXISTS linked_purchase_orders jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.container_reception_items
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid REFERENCES public.purchase_orders(id);

-- Stops a stale draft screen from reopening a completed receipt.
CREATE OR REPLACE FUNCTION public.prevent_completed_reception_reopen()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $guard$
BEGIN
  IF OLD.status = 'completed' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'Una recepción completada no puede volver a borrador.';
  END IF;
  RETURN NEW;
END;
$guard$;
DROP TRIGGER IF EXISTS trg_prevent_completed_reception_reopen ON public.container_receptions;
CREATE TRIGGER trg_prevent_completed_reception_reopen
  BEFORE UPDATE OF status ON public.container_receptions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_completed_reception_reopen();

-- A stable reception UUID is the retry key. Draft replacement and confirmation
-- both lock that row; a completed reception can never be reopened by this RPC.
CREATE OR REPLACE FUNCTION public.save_container_reception_atomic(
  p_reception_id uuid,
  p_header jsonb,
  p_items jsonb,
  p_linked_pos jsonb DEFAULT '[]'::jsonb,
  p_confirm boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_rec public.container_receptions%ROWTYPE;
  v_h public.container_receptions%ROWTYPE;
  v_item jsonb;
  v_link jsonb;
  v_product record;
  v_group record;
  v_line record;
  v_transit record;
  v_so public.service_orders%ROWTYPE;
  v_po_ids uuid[] := '{}';
  v_po_id uuid;
  v_pid uuid;
  v_wh uuid;
  v_qty integer;
  v_remaining integer;
  v_old integer;
  v_cost numeric;
  v_origin numeric := 0;
  v_additional numeric;
  v_charge numeric := 0;
  v_stock_before numeric;
  v_avg numeric;
  v_key text;
  v_number numeric;
  v_supplier uuid;
  v_destination text;
  v_references text;
  v_warning text;
  v_completed boolean := coalesce(p_confirm, false);
BEGIN
  IF v_actor IS NULL OR NOT public.is_explicit_super_admin() THEN
    RAISE EXCEPTION 'Solo Super Admin activo puede guardar o confirmar recepciones.' USING ERRCODE = '42501';
  END IF;
  IF p_reception_id IS NULL THEN RAISE EXCEPTION 'Falta el identificador de recepción.'; END IF;
  IF jsonb_typeof(p_header) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_typeof(p_linked_pos) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Recepción inválida: encabezado, partidas y órdenes vinculadas son obligatorios.';
  END IF;

  -- Serializes even the first concurrent submission for a newly generated UUID.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_reception_id::text, 0));
  SELECT * INTO v_rec FROM public.container_receptions WHERE id = p_reception_id FOR UPDATE;
  IF FOUND AND v_rec.status = 'completed' THEN
    IF v_completed THEN
      RETURN jsonb_build_object('success', true, 'id', p_reception_id, 'already_completed', true);
    END IF;
    RAISE EXCEPTION 'Esta recepción ya está completada; no puede guardarse otra vez como borrador.';
  END IF;
  IF FOUND AND v_rec.status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Solo se puede confirmar una recepción en borrador.';
  END IF;

  v_h := jsonb_populate_record(NULL::public.container_receptions, p_header);
  IF v_h.warehouse_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.warehouses WHERE id = v_h.warehouse_id AND is_active IS TRUE
  ) THEN RAISE EXCEPTION 'Selecciona una bodega principal activa.'; END IF;
  IF v_h.freight_external IS TRUE AND nullif(btrim(v_h.freight_external_carrier), '') IS NULL THEN
    RAISE EXCEPTION 'Indica el transportista externo.';
  END IF;
  FOREACH v_key IN ARRAY ARRAY['freight_maritime','freight_national','import_taxes','port_handling',
    'customs_broker','other_costs','exchange_rate_goods','exchange_rate_freight'] LOOP
    v_number := coalesce(nullif(p_header->>v_key, '')::numeric, 0);
    IF v_number::text IN ('NaN','Infinity','-Infinity') OR v_number < 0
       OR (v_key LIKE 'exchange_rate_%' AND v_number <= 0) THEN
      RAISE EXCEPTION 'Valor inválido en %.', v_key;
    END IF;
  END LOOP;
  IF v_h.distributor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_h.distributor_id AND role = 'distributor'
      AND sub_role = 'distributor_pro' AND is_active IS TRUE
  ) THEN RAISE EXCEPTION 'El distribuidor PRO no está activo.'; END IF;

  FOR v_link IN SELECT value FROM jsonb_array_elements(p_linked_pos) ORDER BY value->>'id' LOOP
    v_po_id := nullif(v_link->>'id', '')::uuid;
    IF v_po_id IS NULL OR v_po_id = ANY(v_po_ids) THEN RAISE EXCEPTION 'Orden vinculada inválida o duplicada.'; END IF;
    PERFORM 1 FROM public.purchase_orders WHERE id = v_po_id
      AND status IN ('draft','sent','partially_received') FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'La orden vinculada % no está disponible para recepción.', v_po_id; END IF;
    v_po_ids := array_append(v_po_ids, v_po_id);
  END LOOP;
  IF v_h.purchase_order_id IS NOT NULL AND NOT (v_h.purchase_order_id = ANY(v_po_ids)) THEN
    RAISE EXCEPTION 'La orden principal debe estar incluida en las órdenes vinculadas.';
  END IF;
  IF v_h.supplier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id=v_h.supplier_id) THEN
    RAISE EXCEPTION 'Proveedor no encontrado.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_pid := nullif(v_item->>'product_id', '')::uuid;
    v_wh := coalesce(nullif(v_item->>'warehouse_id', '')::uuid, v_h.warehouse_id);
    v_qty := (v_item->>'quantity')::integer;
    v_cost := coalesce(nullif(v_item->>'unit_origin_cost', '')::numeric, 0);
    IF v_qty IS NULL OR v_qty < 0 OR (v_completed AND v_qty = 0)
       OR v_cost::text IN ('NaN','Infinity','-Infinity') OR v_cost < 0 THEN
      RAISE EXCEPTION 'Cantidad o costo inválidos para producto %.', v_pid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id=v_pid AND is_active IS TRUE)
       OR NOT EXISTS (SELECT 1 FROM public.warehouses WHERE id=v_wh AND is_active IS TRUE) THEN
      RAISE EXCEPTION 'Producto o bodega inactivos en una partida.';
    END IF;
    v_po_id := coalesce(nullif(v_item->>'purchase_order_id', '')::uuid,
      CASE WHEN cardinality(v_po_ids)=1 THEN v_po_ids[1] END);
    IF cardinality(v_po_ids)>0 AND (v_po_id IS NULL OR NOT (v_po_id=ANY(v_po_ids))) THEN
      RAISE EXCEPTION 'Asigna cada partida a una de las órdenes vinculadas.';
    END IF;
    IF v_po_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=v_po_id AND product_id=v_pid
    ) THEN RAISE EXCEPTION 'El producto % no pertenece a la orden %.', v_pid, v_po_id; END IF;
    v_origin := v_origin + v_qty*v_cost*coalesce(v_h.exchange_rate_goods,1);
    v_number := coalesce(nullif(v_item->>'unit_pro_price','')::numeric,0);
    IF v_number::text IN ('NaN','Infinity','-Infinity') OR v_number<0
      OR (v_completed AND v_h.distributor_id IS NOT NULL AND v_number<=0) THEN
      RAISE EXCEPTION 'Precio PRO inválido para producto %.', v_pid;
    END IF;
    IF v_h.distributor_id IS NOT NULL THEN v_charge := v_charge + v_qty*v_number; END IF;
  END LOOP;
  v_additional := coalesce(v_h.freight_maritime,0)*coalesce(v_h.exchange_rate_freight,1)
    + coalesce(v_h.freight_national,0)+coalesce(v_h.import_taxes,0)+coalesce(v_h.port_handling,0)
    + coalesce(v_h.customs_broker,0)+coalesce(v_h.other_costs,0);
  IF v_completed AND v_origin=0 AND v_additional>0 THEN
    RAISE EXCEPTION 'No se pueden distribuir gastos sin costo de origen; revisa los costos antes de confirmar.';
  END IF;

  INSERT INTO public.container_receptions(id,warehouse_id,created_by)
    VALUES(p_reception_id,v_h.warehouse_id,v_actor) ON CONFLICT(id) DO NOTHING;
  UPDATE public.container_receptions SET
    supplier_id=v_h.supplier_id, purchase_order_id=v_h.purchase_order_id,
    distributor_id=v_h.distributor_id, warehouse_id=v_h.warehouse_id,
    reception_date=coalesce(v_h.reception_date,current_date),container_label=v_h.container_label,
    pedimento_number=v_h.pedimento_number,bl_number=v_h.bl_number,operation_number=v_h.operation_number,
    customs_broker_ref=v_h.customs_broker_ref,freight_maritime=coalesce(v_h.freight_maritime,0),
    freight_national=coalesce(v_h.freight_national,0),freight_external=coalesce(v_h.freight_external,false),
    freight_external_carrier=v_h.freight_external_carrier,import_taxes=coalesce(v_h.import_taxes,0),
    port_handling=coalesce(v_h.port_handling,0),customs_broker=coalesce(v_h.customs_broker,0),
    other_costs=coalesce(v_h.other_costs,0),other_costs_description=v_h.other_costs_description,
    exchange_rate_goods=coalesce(v_h.exchange_rate_goods,1),exchange_rate_freight=coalesce(v_h.exchange_rate_freight,1),
    total_origin_cost=v_origin,total_additional_costs=v_additional,total_landed_cost=v_origin+v_additional,
    charge_amount=v_charge,notes=v_h.notes,linked_purchase_orders=p_linked_pos
  WHERE id=p_reception_id;
  DELETE FROM public.container_reception_items WHERE reception_id=p_reception_id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_cost := coalesce(nullif(v_item->>'unit_origin_cost','')::numeric,0)*coalesce(v_h.exchange_rate_goods,1);
    INSERT INTO public.container_reception_items(reception_id,product_id,warehouse_id,purchase_order_id,
      quantity,unit_origin_cost,unit_landed_cost,unit_pro_price)
    VALUES(p_reception_id,(v_item->>'product_id')::uuid,
      coalesce(nullif(v_item->>'warehouse_id','')::uuid,v_h.warehouse_id),
      coalesce(nullif(v_item->>'purchase_order_id','')::uuid,CASE WHEN cardinality(v_po_ids)=1 THEN v_po_ids[1] END),
      (v_item->>'quantity')::integer,coalesce(nullif(v_item->>'unit_origin_cost','')::numeric,0),
      CASE WHEN v_origin>0 THEN v_cost*(1+v_additional/v_origin) ELSE 0 END,
      CASE WHEN v_h.distributor_id IS NOT NULL THEN nullif(v_item->>'unit_pro_price','')::numeric END);
  END LOOP;
  IF NOT v_completed THEN RETURN jsonb_build_object('success',true,'id',p_reception_id,'status','draft'); END IF;

  -- Product locks, then warehouse locks, always in a deterministic order.
  -- Costs are weighted once per product, including all its destination lines.
  FOR v_group IN
    SELECT product_id,sum(quantity) qty,
      CASE WHEN v_origin>0 THEN sum(quantity*unit_origin_cost)*coalesce(v_h.exchange_rate_goods,1)*(1+v_additional/v_origin)
        ELSE 0 END landed_value
    FROM public.container_reception_items WHERE reception_id=p_reception_id GROUP BY product_id ORDER BY product_id
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id=v_group.product_id FOR UPDATE;
    SELECT coalesce(sum(stock_quantity),0) INTO v_stock_before FROM public.warehouse_stock WHERE product_id=v_group.product_id;
    FOR v_line IN
      SELECT i.*,w.name warehouse_name FROM public.container_reception_items i
      JOIN public.warehouses w ON w.id=i.warehouse_id WHERE i.reception_id=p_reception_id
        AND i.product_id=v_group.product_id ORDER BY i.warehouse_id,i.id
    LOOP
      INSERT INTO public.warehouse_stock(warehouse_id,product_id,stock_quantity,reserved_quantity)
        VALUES(v_line.warehouse_id,v_line.product_id,0,0) ON CONFLICT(warehouse_id,product_id) DO NOTHING;
      SELECT stock_quantity INTO v_old FROM public.warehouse_stock
        WHERE warehouse_id=v_line.warehouse_id AND product_id=v_line.product_id FOR UPDATE;
      UPDATE public.warehouse_stock SET stock_quantity=coalesce(v_old,0)+v_line.quantity,updated_at=now()
        WHERE warehouse_id=v_line.warehouse_id AND product_id=v_line.product_id;
      INSERT INTO public.inventory_logs(user_id,product_id,quantity_change,reason)
        VALUES(v_actor,v_line.product_id,v_line.quantity,
          format('Recepción contenedor: %s [REC:%s] [Bodega: %s]',coalesce(v_h.container_label,p_reception_id::text),p_reception_id,v_line.warehouse_name));
      INSERT INTO public.audit_log(user_id,action,entity_type,entity_id,details)
        VALUES(v_actor,'stock_increase','warehouse_stock',v_line.product_id,
          jsonb_build_object('reception_id',p_reception_id,'warehouse_id',v_line.warehouse_id,'warehouse',v_line.warehouse_name,
          'sku',v_product.sku,'before',coalesce(v_old,0),'change',v_line.quantity,'after',coalesce(v_old,0)+v_line.quantity));
    END LOOP;
    IF v_group.landed_value>0 THEN
      v_avg := CASE WHEN v_stock_before<=0 OR coalesce(v_product.avg_cost,0)<=0 THEN v_group.landed_value/v_group.qty
        ELSE (v_stock_before*v_product.avg_cost+v_group.landed_value)/(v_stock_before+v_group.qty) END;
      UPDATE public.products SET avg_cost=round(v_avg,2) WHERE id=v_group.product_id;
    END IF;
  END LOOP;

  FOR v_link IN SELECT value FROM jsonb_array_elements(p_linked_pos) ORDER BY value->>'id' LOOP
    v_po_id := (v_link->>'id')::uuid;
    FOR v_line IN SELECT product_id,warehouse_id,sum(quantity)::integer quantity
      FROM public.container_reception_items WHERE reception_id=p_reception_id AND purchase_order_id=v_po_id
      GROUP BY product_id,warehouse_id ORDER BY product_id,warehouse_id
    LOOP
      v_remaining := v_line.quantity;
      FOR v_transit IN SELECT id,quantity FROM public.transit_shipments
        WHERE purchase_order_id=v_po_id AND product_id=v_line.product_id AND status='in_transit'
        ORDER BY CASE WHEN warehouse_id=v_line.warehouse_id THEN 0 WHEN warehouse_id=v_h.warehouse_id THEN 1 ELSE 2 END,created_at,id
        FOR UPDATE
      LOOP
        EXIT WHEN v_remaining<=0;
        IF v_remaining>=v_transit.quantity THEN
          DELETE FROM public.transit_shipments WHERE id=v_transit.id;
          v_remaining:=v_remaining-v_transit.quantity;
        ELSE
          UPDATE public.transit_shipments SET quantity=quantity-v_remaining WHERE id=v_transit.id;
          v_remaining:=0;
        END IF;
      END LOOP;
    END LOOP;
    IF coalesce((v_link->>'is_final')::boolean,false) THEN
      DELETE FROM public.transit_shipments WHERE purchase_order_id=v_po_id;
    END IF;
    UPDATE public.purchase_orders SET status=CASE WHEN coalesce((v_link->>'is_final')::boolean,false)
      THEN 'received' ELSE 'partially_received' END,updated_at=now() WHERE id=v_po_id;
  END LOOP;

  -- Freight shares the same transaction; failure must not leave completed stock.
  SELECT string_agg(CASE WHEN lower(name) LIKE '%bodega%' THEN name ELSE 'Bodega '||name END,' / ' ORDER BY name)
    INTO v_destination FROM (SELECT DISTINCT w.name FROM public.container_reception_items i
      JOIN public.warehouses w ON w.id=i.warehouse_id WHERE i.reception_id=p_reception_id) d;
  IF (SELECT count(DISTINCT warehouse_id) FROM public.container_reception_items WHERE reception_id=p_reception_id)>1 THEN
    v_destination:=v_destination||' (Full)';
  END IF;
  v_references:=concat_ws(' | ',
    CASE WHEN nullif(v_h.container_label,'') IS NOT NULL THEN 'Contenedor: '||v_h.container_label END,
    CASE WHEN nullif(v_h.pedimento_number,'') IS NOT NULL THEN 'Pedimento: '||v_h.pedimento_number END,
    CASE WHEN nullif(v_h.customs_broker_ref,'') IS NOT NULL THEN 'Ref. Aduanal: '||v_h.customs_broker_ref END,
    CASE WHEN nullif(v_h.operation_number,'') IS NOT NULL THEN 'Operación: '||v_h.operation_number END,
    (SELECT 'POs: '||string_agg(po_number,' / ' ORDER BY po_number) FROM public.purchase_orders WHERE id=ANY(v_po_ids)),
    'Destino: '||v_destination);
  IF (SELECT count(*) FROM public.service_orders WHERE reception_id=p_reception_id)>1 THEN
    RAISE EXCEPTION 'Hay varias órdenes de flete vinculadas; revísalas antes de confirmar.';
  END IF;
  SELECT * INTO v_so FROM public.service_orders WHERE reception_id=p_reception_id FOR UPDATE;
  IF coalesce(v_h.freight_external,false) THEN
    IF v_so.id IS NOT NULL THEN v_warning:='El flete es externo y ya existe una orden vinculada; revisa si debe cancelarse en Proveedores.'; END IF;
  ELSE
    IF v_so.id IS NOT NULL THEN
      UPDATE public.service_orders SET
        description=btrim(regexp_replace('Flete contenedor '||coalesce(v_h.container_label,'')||' — '||coalesce(v_h.operation_number,''),'\s+',' ','g')),
        location=v_destination,reference_info=v_references,agreed_amount=coalesce(v_h.freight_national,0),scheduled_date=coalesce(v_h.reception_date,current_date),updated_at=now()
      WHERE id=v_so.id;
    ELSE
      SELECT id INTO v_supplier FROM public.suppliers WHERE is_active IS TRUE AND service_types @> ARRAY['flete']::text[] ORDER BY id LIMIT 1;
      IF v_supplier IS NULL THEN RAISE EXCEPTION 'No hay transportista activo registrado para el flete; configura uno o selecciona flete externo.'; END IF;
      INSERT INTO public.service_orders(reception_id,supplier_id,service_type,description,location,reference_info,agreed_amount,scheduled_date,status,created_by)
      VALUES(p_reception_id,v_supplier,'flete',
        btrim(regexp_replace('Flete contenedor '||coalesce(v_h.container_label,'')||' — '||coalesce(v_h.operation_number,''),'\s+',' ','g')),
        v_destination,v_references,coalesce(v_h.freight_national,0),coalesce(v_h.reception_date,current_date),'completada',v_actor);
    END IF;
  END IF;
  UPDATE public.container_receptions SET status='completed' WHERE id=p_reception_id;
  INSERT INTO public.audit_log(user_id,action,entity_type,entity_id,details)
    VALUES(v_actor,'reception_completed','container_reception',p_reception_id,
      jsonb_build_object('total_landed_cost',v_origin+v_additional,'charge_amount',v_charge,'linked_pos',p_linked_pos));
  RETURN jsonb_build_object('success',true,'id',p_reception_id,'status','completed','already_completed',false,'warning',v_warning);
END;
$function$;

REVOKE ALL ON FUNCTION public.save_container_reception_atomic(uuid,jsonb,jsonb,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_container_reception_atomic(uuid,jsonb,jsonb,jsonb,boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
