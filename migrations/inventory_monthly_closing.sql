-- ============================================================
-- 2) CIERRE MENSUAL DE INVENTARIO
-- Foto inmutable del stock y su valor (stock físico × costo promedio) por SKU y bodega.
--   • Automático: último día de cada mes a las 23:00 hora de México (pg_cron).
--   • Manual: botón "Generar cierre ahora" (solo Super Admin, solo el último día del mes).
--   • Si ya existe el cierre del mes (p.ej. manual), el automático no hace nada.
-- Ejecutar en Supabase → SQL Editor (después de set_timezone_mexico.sql).
-- ============================================================

-- 2.1 Tablas
CREATE TABLE IF NOT EXISTS public.inventory_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL UNIQUE CHECK (period ~ '^\d{4}-\d{2}$'),   -- 'YYYY-MM'
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method TEXT NOT NULL CHECK (method IN ('auto', 'manual')),
  total_units INT NOT NULL DEFAULT 0,
  total_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  skus_without_cost INT NOT NULL DEFAULT 0,                         -- SKUs con stock pero avg_cost = 0
  created_by UUID REFERENCES public.profiles(id),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.inventory_closing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id UUID NOT NULL REFERENCES public.inventory_closings(id) ON DELETE CASCADE,
  product_id UUID,
  sku TEXT,
  product_name TEXT,
  category TEXT,
  warehouse_id UUID,
  warehouse_name TEXT,
  stock_quantity INT NOT NULL DEFAULT 0,      -- físico (incluye apartado)
  reserved_quantity INT NOT NULL DEFAULT 0,
  avg_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  value NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_closing_items_closing ON public.inventory_closing_items(closing_id);

-- 2.2 RLS: los admins (incluye Contabilidad) solo pueden LEER.
-- Sin políticas de INSERT/UPDATE/DELETE: desde la app nadie puede modificar un cierre.
-- Solo la función generate_inventory_closing (SECURITY DEFINER) inserta.
ALTER TABLE public.inventory_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_closing_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_closings, public.inventory_closing_items FROM anon;

DROP POLICY IF EXISTS "closings_admin_select" ON public.inventory_closings;
CREATE POLICY "closings_admin_select" ON public.inventory_closings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "closing_items_admin_select" ON public.inventory_closing_items;
CREATE POLICY "closing_items_admin_select" ON public.inventory_closing_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2.3 Función que genera el cierre del mes en curso (hora de México)
CREATE OR REPLACE FUNCTION public.generate_inventory_closing(p_method TEXT DEFAULT 'auto')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_mx    TIMESTAMP := now() AT TIME ZONE 'America/Mexico_City';
  v_period    TEXT := to_char(v_now_mx, 'YYYY-MM');
  v_last_day  DATE := (date_trunc('month', v_now_mx) + INTERVAL '1 month - 1 day')::date;
  v_uid       UUID := auth.uid();
  v_id        UUID;
  v_existing  RECORD;
  v_units     INT;
  v_value     NUMERIC;
  v_nocost    INT;
BEGIN
  IF p_method NOT IN ('auto', 'manual') THEN
    RAISE EXCEPTION 'Método inválido: %', p_method;
  END IF;

  -- Llamado desde la app (hay usuario): solo Super Admin y solo el último día del mes.
  -- Llamado por pg_cron: no hay usuario (auth.uid() IS NULL).
  IF v_uid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin' AND sub_role = 'super_admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Solo un Super Admin puede generar el cierre.');
    END IF;
    IF v_now_mx::date <> v_last_day THEN
      RETURN jsonb_build_object('success', false,
        'error', 'El cierre manual solo se puede generar el último día del mes (' || to_char(v_last_day, 'DD/MM/YYYY') || ').');
    END IF;
    p_method := 'manual';
  END IF;

  -- Un solo cierre por mes
  SELECT id, closed_at, method INTO v_existing FROM inventory_closings WHERE period = v_period;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'already_exists', true, 'closing_id', v_existing.id,
      'error', 'El cierre de ' || v_period || ' ya existe (' || v_existing.method || ', ' ||
               to_char(v_existing.closed_at AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') || ').');
  END IF;

  INSERT INTO inventory_closings (period, closed_at, method, created_by)
  VALUES (v_period, now(), p_method, v_uid)
  RETURNING id INTO v_id;

  INSERT INTO inventory_closing_items
    (closing_id, product_id, sku, product_name, category, warehouse_id, warehouse_name,
     stock_quantity, reserved_quantity, avg_cost, value)
  SELECT v_id, p.id, p.sku, p.name, p.category, w.id, w.name,
         COALESCE(ws.stock_quantity, 0), COALESCE(ws.reserved_quantity, 0),
         COALESCE(p.avg_cost, 0),
         ROUND(COALESCE(ws.stock_quantity, 0) * COALESCE(p.avg_cost, 0), 2)
  FROM warehouse_stock ws
  JOIN products p   ON p.id = ws.product_id
  JOIN warehouses w ON w.id = ws.warehouse_id
  WHERE COALESCE(ws.stock_quantity, 0) <> 0;

  SELECT COALESCE(SUM(stock_quantity), 0),
         COALESCE(SUM(value), 0),
         COUNT(DISTINCT product_id) FILTER (WHERE avg_cost = 0 AND stock_quantity > 0)
    INTO v_units, v_value, v_nocost
  FROM inventory_closing_items WHERE closing_id = v_id;

  UPDATE inventory_closings
     SET total_units = v_units, total_value = v_value, skus_without_cost = v_nocost
   WHERE id = v_id;

  RETURN jsonb_build_object('success', true, 'closing_id', v_id, 'period', v_period,
                            'total_units', v_units, 'total_value', v_value, 'skus_without_cost', v_nocost);
END;
$$;

REVOKE ALL ON FUNCTION public.generate_inventory_closing(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_inventory_closing(TEXT) TO authenticated;

-- 2.4 Programación automática con pg_cron
-- pg_cron trabaja en UTC: 23:00 hora de México del último día = 05:00 UTC del día 1.
-- (México no tiene horario de verano desde 2022, la diferencia es fija de 6 h.)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('inventory-monthly-closing')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'inventory-monthly-closing');

SELECT cron.schedule(
  'inventory-monthly-closing',
  '0 5 1 * *',
  $$ SELECT public.generate_inventory_closing('auto'); $$
);

-- Verificación
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'inventory-monthly-closing';
