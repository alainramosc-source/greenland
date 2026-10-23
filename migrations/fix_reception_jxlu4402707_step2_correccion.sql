-- ============================================================
-- PASO 2: CORRECCIÓN recepción JXLU4402707 / JXLU6460620 (Op43)
-- GL22: cantidad 2000 -> 2016, costo origen 6.80 -> 6.45 USD
--
-- Todo corre dentro de un bloque DO (atómico): si algo falla, no se aplica nada.
-- Protegido contra doble ejecución: si GL22 ya no está en 2000 / 6.80, aborta.
-- ============================================================
DO $$
DECLARE
  v_rec_id      UUID := '34d5bea2-a92a-464e-8a69-b191871ed867';
  v_item_gl22   UUID := '8647d4d7-5afb-4279-ae28-0aac81643b48';
  v_wh_vito     UUID := '39daf5bb-5ecf-4755-8078-d7f9911c2b85';
  v_user_alain  UUID := 'c5055cdc-db7a-469d-8c6b-78b44051941b';
  v_old_qty     INT  := 2000;
  v_new_qty     INT  := 2016;
  v_new_cost    NUMERIC := 6.45;
  v_tc          NUMERIC;
  v_add         NUMERIC;
  v_origin_mxn  NUMERIC;
  v_gl22_pid    UUID;
  r             RECORD;
  v_total_stock NUMERIC;
  v_new_avg     NUMERIC;
BEGIN
  -- Guardas
  PERFORM 1 FROM container_reception_items
   WHERE id = v_item_gl22 AND reception_id = v_rec_id AND quantity = v_old_qty AND unit_origin_cost = 6.80;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GL22 ya no está en 2000 pzas / 6.80 USD — la corrección parece ya aplicada. Abortando.';
  END IF;

  SELECT exchange_rate_goods, total_additional_costs INTO v_tc, v_add
    FROM container_receptions WHERE id = v_rec_id AND status = 'completed';
  IF v_tc IS NULL THEN RAISE EXCEPTION 'Recepción no encontrada o no completada'; END IF;

  SELECT product_id INTO v_gl22_pid FROM container_reception_items WHERE id = v_item_gl22;

  -- Foto de costos ANTES (para corregir avg_cost)
  CREATE TEMP TABLE _before ON COMMIT DROP AS
    SELECT id, product_id, quantity, unit_landed_cost AS old_landed
    FROM container_reception_items WHERE reception_id = v_rec_id;

  -- 1. Corregir partida GL22
  UPDATE container_reception_items
     SET quantity = v_new_qty, unit_origin_cost = v_new_cost
   WHERE id = v_item_gl22;

  -- 2. Recalcular costo origen total (MXN) y costo puesto por unidad de TODAS las partidas
  --    Misma fórmula que useReceptionForm.getLandedPerUnit
  SELECT SUM(quantity * unit_origin_cost) * v_tc INTO v_origin_mxn
    FROM container_reception_items WHERE reception_id = v_rec_id;

  UPDATE container_reception_items
     SET unit_landed_cost = ROUND(unit_origin_cost * v_tc * (1 + v_add / v_origin_mxn), 2)
   WHERE reception_id = v_rec_id;

  -- 3. Totales de la recepción (los costos adicionales no cambian)
  UPDATE container_receptions
     SET total_origin_cost = ROUND(v_origin_mxn, 2),
         total_landed_cost = ROUND(v_origin_mxn + v_add, 2)
   WHERE id = v_rec_id;

  -- 4. Corregir avg_cost: quitar el efecto de la partida vieja y meter la nueva
  --    new_avg = (avg_actual * stock_total - qty_old * landed_old + qty_new * landed_new) / (stock_total + delta_qty)
  FOR r IN
    SELECT b.product_id, b.quantity AS old_qty, b.old_landed, i.quantity AS new_qty, i.unit_landed_cost AS new_landed, p.avg_cost
      FROM _before b
      JOIN container_reception_items i ON i.id = b.id
      JOIN products p ON p.id = b.product_id
  LOOP
    SELECT COALESCE(SUM(stock_quantity), 0) INTO v_total_stock FROM warehouse_stock WHERE product_id = r.product_id;
    IF v_total_stock <= 0 THEN CONTINUE; END IF;
    v_new_avg := (r.avg_cost * v_total_stock - r.old_qty * r.old_landed + r.new_qty * r.new_landed)
                 / (v_total_stock + (r.new_qty - r.old_qty));
    UPDATE products SET avg_cost = ROUND(v_new_avg, 2) WHERE id = r.product_id;
  END LOOP;

  -- 5. +16 pzas GL22 en Vito Alessio (registra en inventory_logs y audit_log)
  PERFORM adjust_warehouse_stock(
    v_gl22_pid, v_wh_vito, v_new_qty - v_old_qty,
    'Corrección recepción contenedor: JXLU4402707 / JXLU6460620 — GL22 2000→2016 pzas (Bodega Vito Alessio)',
    v_user_alain
  );

  RAISE NOTICE 'Corrección aplicada correctamente';
END $$;

-- Verificación
SELECT p.sku, i.quantity, i.unit_origin_cost, i.unit_landed_cost, p.avg_cost,
       (SELECT stock_quantity FROM warehouse_stock ws WHERE ws.product_id = p.id AND ws.warehouse_id = i.warehouse_id) AS stock_bodega_partida,
       r.total_origin_cost, r.total_landed_cost
FROM container_reception_items i
JOIN products p ON p.id = i.product_id
JOIN container_receptions r ON r.id = i.reception_id
WHERE i.reception_id = '34d5bea2-a92a-464e-8a69-b191871ed867'
ORDER BY p.sku;
