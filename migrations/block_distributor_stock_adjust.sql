-- =============================================================================
-- Bloquear ajustes manuales de inventario a distribuidores (PRO y normales)
-- =============================================================================
-- Contexto:
--   * Escribir directo en warehouse_stock ya está restringido a admins por RLS.
--   * El hueco es el RPC adjust_warehouse_stock (SECURITY DEFINER): un
--     distribuidor podía llamarlo directo y "ajustar" su bodega.
--
-- Solución (sin tocar el cuerpo de adjust_warehouse_stock):
--   Trigger BEFORE INSERT/UPDATE en warehouse_stock que revisa la pila de
--   llamadas (PG_CONTEXT). Si quien llama es distribuidor y la operación
--   NACE directamente de adjust_warehouse_stock (llamada directa = ajuste
--   manual / CSV), se rechaza.
--
--   Siguen funcionando para el PRO los flujos legítimos, porque en ellos la
--   función de más afuera es otra:
--     - create_retail_sale        (Venta al Público PRO)
--     - despacho / liquidación de lastmile_orders
--     - transfer_stock            (Transferir)
--   Admins, SQL Editor y pg_cron no se ven afectados.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.block_distributor_manual_stock_adjust()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_block_distributor_manual_stock_adjust ON public.warehouse_stock;
CREATE TRIGGER trg_block_distributor_manual_stock_adjust
  BEFORE INSERT OR UPDATE ON public.warehouse_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.block_distributor_manual_stock_adjust();
