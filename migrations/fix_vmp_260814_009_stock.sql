-- =====================================================
-- FIX RETROACTIVO: Reintegrar stock del ticket devuelto VMP-260814-009
-- Ejecutar en Supabase SQL Editor
-- =====================================================

DO $$
DECLARE
  v_warehouse_id UUID;
  v_gl26_id UUID;
  v_clip_id UUID;
BEGIN
  -- 1. Obtener ID de la bodega Vito Alessio
  SELECT id INTO v_warehouse_id FROM warehouses WHERE name LIKE '%Vito Alessio%' LIMIT 1;
  
  -- 2. Obtener ID del producto GL26 (Lambrín Nogal Oscuro)
  SELECT id INTO v_gl26_id FROM products WHERE name LIKE '%Lambrín Nogal Oscuro%' OR sku = 'GL26' LIMIT 1;
  
  -- 3. Obtener ID del Clip de acero (interior)
  SELECT id INTO v_clip_id FROM products WHERE name LIKE '%Clip de acero%' LIMIT 1;
  
  -- 4. Reintegrar +3 piezas de GL26
  IF v_warehouse_id IS NOT NULL AND v_gl26_id IS NOT NULL THEN
    PERFORM adjust_warehouse_stock(
      v_gl26_id,
      v_warehouse_id,
      3,
      'ENTRADA_DEVOLUCION (Ajuste Retroactivo) — Ticket VMP-260814-009'
    );
  END IF;
  
  -- 5. Reintegrar +10 piezas de Clip de acero
  IF v_warehouse_id IS NOT NULL AND v_clip_id IS NOT NULL THEN
    PERFORM adjust_warehouse_stock(
      v_clip_id,
      v_warehouse_id,
      10,
      'ENTRADA_DEVOLUCION (Ajuste Retroactivo) — Ticket VMP-260814-009'
    );
  END IF;
END $$;
