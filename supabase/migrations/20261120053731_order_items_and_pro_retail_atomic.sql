BEGIN;

CREATE OR REPLACE FUNCTION public.update_order_item_quantity(p_order_id uuid, p_item_id uuid, p_new_quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID := auth.uid();
  v_order RECORD;
  v_item RECORD;
  v_wh_stock RECORD;
  v_diff INTEGER;
  v_wh_id UUID;
  v_is_admin BOOLEAN;
  v_has_sync_trigger BOOLEAN;
BEGIN
  IF p_new_quantity IS NULL OR p_new_quantity < 0 THEN
    RETURN jsonb_build_object('success',false,'error','Cantidad inválida.');
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active IS TRUE) THEN
    RETURN jsonb_build_object('success',false,'error','Perfil inactivo o inexistente.');
  END IF;
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  IF p_new_quantity=0 AND (SELECT count(*) FROM public.order_items WHERE order_id=p_order_id)<=1 THEN
    RETURN jsonb_build_object('success',false,'error','No puedes eliminar la única partida.');
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

  SELECT oi.*, p.sku, p.name AS product_name
  INTO v_item
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.id = p_item_id AND oi.order_id = p_order_id
  FOR UPDATE OF oi;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item no encontrado');
  END IF;

  v_wh_id := v_item.warehouse_id;

  IF p_new_quantity <= 0 THEN
    v_diff := -v_item.quantity;
  ELSE
    v_diff := p_new_quantity - v_item.quantity;
  END IF;

  -- Si el estado del pedido implica ajustar reserva o stock y hay cambio de cantidad, exigir bodega en la partida antes de mover inventario
  IF v_order.status IN ('confirmed', 'in_fulfillment', 'shipped', 'closed') AND v_diff != 0 THEN
    IF v_wh_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format(
          'La partida %s (%s) no tiene bodega asignada. Asigna una bodega a la partida antes de modificar su cantidad.',
          v_item.sku, v_item.product_name
        )
      );
    END IF;

    SELECT stock_quantity, reserved_quantity
    INTO v_wh_stock
    FROM public.warehouse_stock
    WHERE warehouse_id = v_wh_id AND product_id = v_item.product_id
    FOR UPDATE;

    IF v_order.status IN ('confirmed','in_fulfillment') AND v_diff < 0 AND (v_wh_stock.reserved_quantity IS NULL OR v_wh_stock.reserved_quantity < -v_diff) THEN
      RETURN jsonb_build_object('success',false,'error','La reserva de origen no coincide. Revisa el pedido antes de modificarlo.');
    END IF;

    IF v_diff > 0 THEN
      IF NOT FOUND OR (COALESCE(v_wh_stock.stock_quantity, 0) - COALESCE(v_wh_stock.reserved_quantity, 0)) < v_diff THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format(
            'Stock disponible insuficiente en bodega para incrementar %s (%s). Disponible: %s, adicional solicitado: %s.',
            v_item.sku, v_item.product_name,
            GREATEST(0, COALESCE(v_wh_stock.stock_quantity, 0) - COALESCE(v_wh_stock.reserved_quantity, 0)),
            v_diff
          )
        );
      END IF;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_product_stock'
      AND NOT tgisinternal
  ) INTO v_has_sync_trigger;

  IF p_new_quantity <= 0 THEN
    IF v_order.status IN ('shipped', 'closed') THEN
      UPDATE public.warehouse_stock
      SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff,
          updated_at = now()
      WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;

      IF NOT v_has_sync_trigger THEN
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) - v_diff
        WHERE id = v_item.product_id;
      END IF;
    ELSIF v_order.status IN ('confirmed', 'in_fulfillment') THEN
      UPDATE public.warehouse_stock
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff),
          updated_at = now()
      WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;

      IF NOT v_has_sync_trigger THEN
        UPDATE public.products
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff)
        WHERE id = v_item.product_id;
      END IF;
    END IF;

    DELETE FROM public.order_items WHERE id = p_item_id AND order_id = p_order_id;
  ELSE
    IF v_diff != 0 THEN
      IF v_order.status IN ('shipped', 'closed') THEN
        UPDATE public.warehouse_stock
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff),
            updated_at = now()
        WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;

        IF NOT v_has_sync_trigger THEN
          UPDATE public.products
          SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_diff)
          WHERE id = v_item.product_id;
        END IF;
      ELSIF v_order.status IN ('confirmed', 'in_fulfillment') THEN
        UPDATE public.warehouse_stock
        SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff),
            updated_at = now()
        WHERE product_id = v_item.product_id AND warehouse_id = v_wh_id;

        IF NOT v_has_sync_trigger THEN
          UPDATE public.products
          SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) + v_diff)
          WHERE id = v_item.product_id;
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
$function$;

-- Same legacy entry points, with a new explicit-warehouse variant for the UI.
CREATE FUNCTION public.add_order_item_in_warehouse(p_order_id uuid,p_product_id uuid,p_quantity integer DEFAULT 1,p_unit_price numeric DEFAULT 0,p_warehouse_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; wh uuid:=p_warehouse_id; price numeric; available integer; item_id uuid; admin boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado.'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado.'; END IF;
 admin:=public.can_manage_inventory();
 IF NOT admin AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active IS TRUE AND id=o.distributor_id AND o.status='pending') THEN
  RAISE EXCEPTION 'No tienes permiso para modificar este pedido.';
 END IF;
 IF o.status IS NULL OR o.status NOT IN ('pending','confirmed','in_fulfillment','shipped','closed') THEN RAISE EXCEPTION 'El estado del pedido no permite agregar partidas.'; END IF;
 IF p_quantity IS NULL OR p_quantity<=0 OR p_unit_price IS NULL OR p_unit_price<0 OR p_unit_price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Cantidad o precio inválido.'; END IF;
 SELECT p.price INTO price FROM public.products p WHERE id=p_product_id AND is_active IS TRUE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Producto inexistente o inactivo.'; END IF;
 IF admin AND p_unit_price>0 THEN price:=p_unit_price; END IF;
 IF wh IS NULL AND o.status<>'pending' THEN
  SELECT CASE WHEN count(DISTINCT warehouse_id)=1 THEN (array_agg(DISTINCT warehouse_id) FILTER(WHERE warehouse_id IS NOT NULL))[1] END
   INTO wh FROM public.order_items WHERE order_id=p_order_id;
 END IF;
 IF wh IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=wh AND is_active IS TRUE) THEN RAISE EXCEPTION 'Bodega inválida o inactiva.'; END IF;
 IF o.status<>'pending' THEN
  IF wh IS NULL THEN RAISE EXCEPTION 'Selecciona la bodega de la nueva partida antes de agregarla.'; END IF;
  SELECT coalesce(stock_quantity,0)-coalesce(reserved_quantity,0) INTO available FROM public.warehouse_stock
   WHERE warehouse_id=wh AND product_id=p_product_id FOR UPDATE;
  IF NOT FOUND OR available<p_quantity THEN RAISE EXCEPTION 'Stock disponible insuficiente en la bodega seleccionada.'; END IF;
  IF o.status IN ('confirmed','in_fulfillment') THEN
   UPDATE public.warehouse_stock SET reserved_quantity=coalesce(reserved_quantity,0)+p_quantity,updated_at=now() WHERE warehouse_id=wh AND product_id=p_product_id;
  ELSE
   UPDATE public.warehouse_stock SET stock_quantity=stock_quantity-p_quantity,updated_at=now() WHERE warehouse_id=wh AND product_id=p_product_id;
   INSERT INTO public.inventory_logs(user_id,product_id,quantity_change,reason) VALUES(auth.uid(),p_product_id,-p_quantity,'Partida agregada a pedido enviado '||o.order_number||' [Bodega: '||wh||']');
  END IF;
 END IF;
 INSERT INTO public.order_items(order_id,product_id,quantity,unit_price,warehouse_id) VALUES(p_order_id,p_product_id,p_quantity,price,wh) RETURNING id INTO item_id;
 UPDATE public.orders SET total_amount=(SELECT coalesce(sum(quantity*unit_price),0) FROM public.order_items WHERE order_id=p_order_id) WHERE id=p_order_id;
 INSERT INTO public.audit_log(user_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'order_item_added','order',p_order_id,jsonb_build_object('item_id',item_id,'warehouse_id',wh,'quantity',p_quantity));
 RETURN jsonb_build_object('success',true,'item_id',item_id);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error',SQLERRM);
END $$;

CREATE OR REPLACE FUNCTION public.add_item_to_order(p_order_id uuid,p_product_id uuid,p_quantity integer DEFAULT 1,p_unit_price numeric DEFAULT 0)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT public.add_order_item_in_warehouse(p_order_id,p_product_id,p_quantity,p_unit_price,NULL);
$$;

CREATE OR REPLACE FUNCTION public.remove_item_from_order(p_order_id uuid,p_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado.'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado.'; END IF;
 IF NOT public.can_manage_inventory() AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active IS TRUE AND id=o.distributor_id AND o.status='pending') THEN RAISE EXCEPTION 'No tienes permiso para modificar este pedido.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.order_items WHERE id=p_item_id AND order_id=p_order_id) THEN RAISE EXCEPTION 'Partida no encontrada.'; END IF;
 IF (SELECT count(*) FROM public.order_items WHERE order_id=p_order_id)<=1 THEN RAISE EXCEPTION 'No puedes eliminar la única partida. Cancela el pedido si es necesario.'; END IF;
 -- The quantity RPC locks the header and item and releases reserved inventory
 -- or restores physical inventory, according to the current order state.
 result:=public.update_order_item_quantity(p_order_id,p_item_id,0);
 IF coalesce((result->>'success')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION '%',coalesce(result->>'error','No se pudo eliminar la partida.'); END IF;
 INSERT INTO public.audit_log(user_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'order_item_removed','order',p_order_id,jsonb_build_object('item_id',p_item_id));
 RETURN result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error',SQLERRM);
END $$;

CREATE OR REPLACE FUNCTION public.assign_item_warehouse(p_item_id uuid,p_warehouse_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE oid uuid; o public.orders%ROWTYPE; item public.order_items%ROWTYPE; available integer; held integer;
BEGIN
 IF NOT public.can_manage_inventory() THEN RAISE EXCEPTION 'No tienes permisos para reasignar bodega.'; END IF;
 SELECT order_id INTO oid FROM public.order_items WHERE id=p_item_id;
 SELECT * INTO o FROM public.orders WHERE id=oid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado.'; END IF;
 SELECT * INTO item FROM public.order_items WHERE id=p_item_id AND order_id=oid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partida no encontrada.'; END IF;
 IF item.warehouse_id IS NOT DISTINCT FROM p_warehouse_id THEN RETURN jsonb_build_object('success',true); END IF;
 IF o.status IS NULL OR o.status NOT IN ('pending','confirmed','in_fulfillment') THEN RAISE EXCEPTION 'La bodega solo puede cambiarse antes del envío.'; END IF;
 IF p_warehouse_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=p_warehouse_id AND is_active IS TRUE) THEN RAISE EXCEPTION 'Bodega inválida o inactiva.'; END IF;
 IF o.status IN ('confirmed','in_fulfillment') THEN
  IF p_warehouse_id IS NULL THEN RAISE EXCEPTION 'Una partida confirmada necesita bodega asignada.'; END IF;
  -- Same product, deterministic warehouse order. No phantom stock rows.
  PERFORM 1 FROM public.warehouse_stock WHERE product_id=item.product_id AND warehouse_id IN (item.warehouse_id,p_warehouse_id) ORDER BY warehouse_id FOR UPDATE;
  SELECT coalesce(stock_quantity,0)-coalesce(reserved_quantity,0) INTO available FROM public.warehouse_stock WHERE product_id=item.product_id AND warehouse_id=p_warehouse_id;
  IF NOT FOUND OR item.quantity IS NULL OR item.quantity<=0 OR available<item.quantity THEN RAISE EXCEPTION 'Stock disponible insuficiente en la bodega destino.'; END IF;
  IF item.warehouse_id IS NOT NULL THEN
   SELECT coalesce(reserved_quantity,0) INTO held FROM public.warehouse_stock WHERE product_id=item.product_id AND warehouse_id=item.warehouse_id;
   IF NOT FOUND OR held<item.quantity THEN RAISE EXCEPTION 'La reserva de origen no coincide. Revisa el pedido antes de reasignar.'; END IF;
   UPDATE public.warehouse_stock SET reserved_quantity=reserved_quantity-item.quantity,updated_at=now() WHERE product_id=item.product_id AND warehouse_id=item.warehouse_id;
  END IF;
  UPDATE public.warehouse_stock SET reserved_quantity=coalesce(reserved_quantity,0)+item.quantity,updated_at=now() WHERE product_id=item.product_id AND warehouse_id=p_warehouse_id;
 END IF;
 UPDATE public.order_items SET warehouse_id=p_warehouse_id WHERE id=p_item_id;
 INSERT INTO public.audit_log(user_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'order_item_warehouse_changed','order',oid,jsonb_build_object('item_id',p_item_id,'from',item.warehouse_id,'to',p_warehouse_id));
 RETURN jsonb_build_object('success',true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error',SQLERRM);
END $$;

-- Prevent client fallbacks from bypassing the reservation-aware RPCs. Trusted
-- definer functions keep their existing behavior. Price/fulfillment-only edits
-- remain available under the existing RLS policies.
CREATE FUNCTION public.guard_order_item_stock_edit() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE oid uuid; state text;
BEGIN
 IF public.inventory_trusted_role() THEN RETURN coalesce(NEW,OLD); END IF;
 oid:=coalesce(NEW.order_id,OLD.order_id);
 SELECT status INTO state FROM public.orders WHERE id=oid FOR UPDATE;
 IF NOT FOUND THEN
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; -- parent DELETE cascade
  RAISE EXCEPTION 'Pedido no accesible.';
 END IF;
 IF TG_OP='UPDATE' AND (NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.id IS DISTINCT FROM OLD.id) THEN RAISE EXCEPTION 'No se puede cambiar la identidad de una partida.'; END IF;
 IF state IS DISTINCT FROM 'pending' AND (TG_OP<>'UPDATE' OR NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id) THEN
  RAISE EXCEPTION 'Usa las operaciones del pedido para modificar partidas y reservas.' USING ERRCODE='42501';
 END IF;
 IF TG_OP<>'DELETE' AND (NEW.quantity IS NULL OR NEW.quantity<=0) THEN RAISE EXCEPTION 'Cantidad inválida.'; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.guard_order_item_stock_edit() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_guard_order_item_stock_edit BEFORE INSERT OR UPDATE OR DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.guard_order_item_stock_edit();

CREATE OR REPLACE FUNCTION public.create_retail_sale(p_conversation_id uuid DEFAULT NULL,p_warehouse_id uuid DEFAULT NULL,p_delivery_type text DEFAULT 'delivery',p_items jsonb DEFAULT '[]',p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor public.profiles%ROWTYPE; wh uuid:=p_warehouse_id; whname text; line jsonb; pid uuid; qty integer; price numeric; total numeric:=0; available integer; orderid uuid; token text; number text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado.'; END IF;
 SELECT * INTO actor FROM public.profiles WHERE id=auth.uid();
 IF NOT FOUND OR actor.is_active IS NOT TRUE THEN RAISE EXCEPTION 'Perfil inactivo o inexistente.'; END IF;
 IF NOT public.can_manage_inventory() AND NOT (actor.role='distributor' AND actor.sub_role='distributor_pro') THEN RAISE EXCEPTION 'Tu cargo no permite registrar ventas a público.'; END IF;
 IF wh IS NULL THEN
  IF actor.role='distributor' THEN wh:=actor.assigned_warehouse_id;
  ELSE SELECT id INTO wh FROM public.warehouses WHERE code='vito-alessio'; END IF;
 END IF;
 IF actor.role='distributor' AND wh IS DISTINCT FROM actor.assigned_warehouse_id THEN RAISE EXCEPTION 'Solo puedes vender desde tu bodega asignada.'; END IF;
 SELECT name INTO whname FROM public.warehouses WHERE id=wh AND is_active IS TRUE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Bodega inexistente o inactiva.'; END IF;
 IF p_delivery_type IS NULL OR p_delivery_type NOT IN ('pickup','delivery') THEN RAISE EXCEPTION 'Tipo de entrega inválido.'; END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Incluye partidas válidas.'; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF jsonb_typeof(line)<>'object' OR coalesce(line->>'quantity','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'La cantidad debe ser un entero positivo.'; END IF;
  qty:=(line->>'quantity')::integer; price:=(line->>'sale_price')::numeric;
  IF qty<=0 OR price IS NULL OR price<0 OR price::text IN ('NaN','Infinity','-Infinity') OR price<>round(price,2) THEN RAISE EXCEPTION 'Cantidad o precio inválido.'; END IF;
  pid:=nullif(line->>'product_id','')::uuid;
  IF pid IS NULL THEN
   IF line->>'sku' IS DISTINCT FROM 'FLETE-ENVIO' OR qty<>1 THEN RAISE EXCEPTION 'Partida sin producto válido.'; END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM public.products WHERE id=pid AND is_active IS TRUE) THEN RAISE EXCEPTION 'Producto inexistente o inactivo.'; END IF;
  total:=total+qty*price;
 END LOOP;
 IF p_conversation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.inbox_conversations WHERE id=p_conversation_id AND (distributor_id=auth.uid() OR public.can_operate_inbox())) THEN RAISE EXCEPTION 'Conversación no autorizada.'; END IF;
 IF p_delivery_type='pickup' THEN
  -- Aggregate repeated product lines and lock the entire batch before changes.
  PERFORM 1 FROM public.warehouse_stock WHERE warehouse_id=wh AND product_id IN
   (SELECT nullif(value->>'product_id','')::uuid FROM jsonb_array_elements(p_items)) ORDER BY product_id FOR UPDATE;
  FOR pid,qty IN SELECT nullif(value->>'product_id','')::uuid,sum((value->>'quantity')::integer)::integer FROM jsonb_array_elements(p_items)
   WHERE nullif(value->>'product_id','') IS NOT NULL GROUP BY 1 ORDER BY 1 LOOP
   SELECT coalesce(stock_quantity,0)-coalesce(reserved_quantity,0) INTO available FROM public.warehouse_stock WHERE warehouse_id=wh AND product_id=pid;
   IF NOT FOUND OR available<qty THEN RAISE EXCEPTION 'Stock disponible insuficiente para producto % en la bodega seleccionada.',pid; END IF;
  END LOOP;
 END IF;
 token:=replace(gen_random_uuid()::text,'-',''); number:='VP-'||to_char(now(),'YYMMDD')||'-'||upper(substr(token,1,8));
 INSERT INTO public.lastmile_orders(distributor_id,conversation_id,checkout_token,order_number,delivery_type,items,subtotal,total,notes,status,warehouse_name,warehouse_id)
 VALUES(auth.uid(),p_conversation_id,token,number,p_delivery_type,p_items,total,total,p_notes,CASE WHEN p_delivery_type='pickup' THEN 'confirmed' ELSE 'pending' END,whname,wh) RETURNING id INTO orderid;
 IF p_delivery_type='pickup' THEN
  FOR pid,qty IN SELECT nullif(value->>'product_id','')::uuid,sum((value->>'quantity')::integer)::integer FROM jsonb_array_elements(p_items)
   WHERE nullif(value->>'product_id','') IS NOT NULL GROUP BY 1 ORDER BY 1 LOOP
   UPDATE public.warehouse_stock SET stock_quantity=stock_quantity-qty,updated_at=now() WHERE warehouse_id=wh AND product_id=pid;
   INSERT INTO public.inventory_logs(user_id,product_id,quantity_change,reason) VALUES(auth.uid(),pid,-qty,'Venta a público - Orden '||number||' [Bodega: '||whname||']');
  END LOOP;
  UPDATE public.lastmile_orders SET stock_deducted_at=now() WHERE id=orderid;
 END IF;
 RETURN jsonb_build_object('success',true,'order_id',orderid,'checkout_token',token,'order_number',number,'delivery_type',p_delivery_type,'total',total,'warehouse',whname);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error',SQLERRM);
END $$;

CREATE TABLE public.pro_retail_requests(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id),payload jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.pro_retail_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pro_retail_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.pro_retail_requests TO service_role;

CREATE FUNCTION public.create_pro_retail_sale_atomic(p_request_id uuid,p_warehouse_id uuid,p_items jsonb,p_customer_name text DEFAULT NULL,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb:=jsonb_build_object('warehouse_id',p_warehouse_id,'items',p_items,'customer',p_customer_name,'notes',p_notes); prior public.pro_retail_requests%ROWTYPE; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active IS TRUE AND (public.can_manage_inventory() OR (role='distributor' AND sub_role='distributor_pro' AND assigned_warehouse_id=p_warehouse_id))) THEN RAISE EXCEPTION 'No autorizado para registrar venta PRO en esta bodega.'; END IF;
 IF p_request_id IS NULL THEN RAISE EXCEPTION 'Falta el identificador de la operación.'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pro-retail:'||p_request_id::text,0));
 SELECT * INTO prior FROM public.pro_retail_requests WHERE id=p_request_id;
 IF FOUND THEN
  IF prior.user_id IS DISTINCT FROM auth.uid() OR prior.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'El identificador corresponde a otra operación.'; END IF;
  RETURN prior.result||jsonb_build_object('replayed',true);
 END IF;
 result:=public.create_retail_sale(NULL,p_warehouse_id,'pickup',p_items,p_notes);
 IF coalesce((result->>'success')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION '%',coalesce(result->>'error','No se pudo registrar la venta.'); END IF;
 UPDATE public.lastmile_orders SET payment_method='cash',payment_status='paid',customer_name=p_customer_name WHERE id=(result->>'order_id')::uuid;
 INSERT INTO public.pro_retail_requests(id,user_id,payload,result) VALUES(p_request_id,auth.uid(),payload,result);
 RETURN result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error',SQLERRM);
END $$;

REVOKE ALL ON FUNCTION public.add_order_item_in_warehouse(uuid,uuid,integer,numeric,uuid),public.add_item_to_order(uuid,uuid,integer,numeric),public.remove_item_from_order(uuid,uuid),public.assign_item_warehouse(uuid,uuid),public.create_retail_sale(uuid,uuid,text,jsonb,text),public.create_pro_retail_sale_atomic(uuid,uuid,jsonb,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_order_item_in_warehouse(uuid,uuid,integer,numeric,uuid),public.add_item_to_order(uuid,uuid,integer,numeric),public.remove_item_from_order(uuid,uuid),public.assign_item_warehouse(uuid,uuid),public.create_retail_sale(uuid,uuid,text,jsonb,text),public.create_pro_retail_sale_atomic(uuid,uuid,jsonb,text,text) TO authenticated,service_role;
COMMIT;
