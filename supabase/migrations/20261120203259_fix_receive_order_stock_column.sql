BEGIN;
-- Fix only the live inventory column mismatch. Preserve authorization,
-- order row lock, shipped-only transition and all-or-nothing receipt.
CREATE OR REPLACE FUNCTION public.receive_order(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    INSERT INTO public.distributor_inventory (distributor_id, product_id, stock, updated_at)
    VALUES (v_order.distributor_id, v_item.product_id, v_item.quantity, now())
    ON CONFLICT (distributor_id, product_id)
    DO UPDATE SET
      stock = COALESCE(public.distributor_inventory.stock, 0) + v_item.quantity,
      updated_at = now();
  END LOOP;

  UPDATE public.orders
  SET status = 'closed',
      delivered_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;
REVOKE ALL ON FUNCTION public.receive_order(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receive_order(uuid) TO authenticated,service_role;
COMMIT;
