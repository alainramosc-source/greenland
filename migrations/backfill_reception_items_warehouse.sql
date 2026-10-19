-- ================================================
-- Backfill de warehouse_id en partidas de recepción
-- Llena container_reception_items.warehouse_id en partidas viejas que lo
-- tienen vacío, para poder eliminar del código los "planes B" que
-- adivinaban la bodega (etiquetas en notas, búsqueda en inventory_logs, etc.)
--
-- Prioridad para decidir la bodega de cada partida:
--   1. Etiqueta [ITEM_WAREHOUSES:{...}] guardada en las notas de la recepción
--   2. Movimiento real en inventory_logs:
--      "Recepción contenedor: <contenedor> (<bodega>)"
--   3. Bodega principal de la recepción (encabezado)
--
-- Correr en dos pasos: primero el PASO 1 (solo consulta), revisar,
-- y luego el PASO 2 (actualiza).
-- ================================================


-- ------------------------------------------------
-- PASO 1: VISTA PREVIA (no modifica nada)
-- ------------------------------------------------
WITH pending AS (
  SELECT
    cri.id            AS item_id,
    cr.operation_number,
    cr.container_label,
    p.sku,
    cri.quantity,
    -- 1. Etiqueta JSON en notas
    (
      substring(cr.notes FROM '\[ITEM_WAREHOUSES:(\{[^\]]+\})\]')::jsonb
        ->> cri.product_id::text
    )::uuid AS wh_from_notes,
    -- 2. Movimiento real de inventario
    (
      SELECT w.id
      FROM inventory_logs il
      JOIN warehouses w
        ON il.reason ILIKE '%(' || w.name || ')%'
      WHERE il.product_id = cri.product_id
        AND il.quantity_change > 0
        AND il.reason ILIKE 'Recepción contenedor: '
              || COALESCE(cr.container_label, cr.id::text) || ' (%'
      ORDER BY il.created_at DESC
      LIMIT 1
    ) AS wh_from_logs,
    -- 3. Bodega del encabezado
    cr.warehouse_id AS wh_from_header
  FROM container_reception_items cri
  JOIN container_receptions cr ON cr.id = cri.reception_id
  LEFT JOIN products p ON p.id = cri.product_id
  WHERE cri.warehouse_id IS NULL
)
SELECT
  pending.operation_number,
  pending.container_label,
  pending.sku,
  pending.quantity,
  w.name AS bodega_propuesta,
  CASE
    WHEN wh_from_notes IS NOT NULL THEN 'notas'
    WHEN wh_from_logs  IS NOT NULL THEN 'inventory_logs'
    ELSE 'encabezado'
  END AS fuente,
  -- Marca si las fuentes no coinciden entre sí (revisar a mano)
  (
    wh_from_logs IS NOT NULL
    AND COALESCE(wh_from_notes, wh_from_header) IS DISTINCT FROM wh_from_logs
  ) AS revisar
FROM pending
LEFT JOIN warehouses w
  ON w.id = COALESCE(wh_from_notes, wh_from_logs, wh_from_header)
ORDER BY revisar DESC, pending.operation_number, pending.sku;


-- ------------------------------------------------
-- PASO 2: ACTUALIZAR (correr solo después de revisar el PASO 1)
-- ------------------------------------------------
-- WITH pending AS (
--   SELECT
--     cri.id AS item_id,
--     COALESCE(
--       (substring(cr.notes FROM '\[ITEM_WAREHOUSES:(\{[^\]]+\})\]')::jsonb
--          ->> cri.product_id::text)::uuid,
--       (
--         SELECT w.id
--         FROM inventory_logs il
--         JOIN warehouses w ON il.reason ILIKE '%(' || w.name || ')%'
--         WHERE il.product_id = cri.product_id
--           AND il.quantity_change > 0
--           AND il.reason ILIKE 'Recepción contenedor: '
--                 || COALESCE(cr.container_label, cr.id::text) || ' (%'
--         ORDER BY il.created_at DESC
--         LIMIT 1
--       ),
--       cr.warehouse_id
--     ) AS new_wh
--   FROM container_reception_items cri
--   JOIN container_receptions cr ON cr.id = cri.reception_id
--   WHERE cri.warehouse_id IS NULL
-- )
-- UPDATE container_reception_items cri
-- SET warehouse_id = pending.new_wh
-- FROM pending
-- WHERE cri.id = pending.item_id
--   AND pending.new_wh IS NOT NULL;
