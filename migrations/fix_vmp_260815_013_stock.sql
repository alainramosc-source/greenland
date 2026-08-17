-- =====================================================
-- FIX RETROACTIVO: Reintegrar stock del ticket devuelto VMP-260815-013
-- Ejecutar en Supabase SQL Editor
-- =====================================================

DO $$
DECLARE
  v_warehouse_id UUID;
  v_gl26_id UUID;
  v_angulo_id UUID;
BEGIN
  -- 1. Obtener ID de la bodega Vito Alessio
  SELECT id INTO v_warehouse_id FROM warehouses WHERE name LIKE '%Vito Alessio%' LIMIT 1;
  
  -- 2. Obtener ID del producto GL26 (Lambrín Nogal Oscuro)
  SELECT id INTO v_gl26_id FROM products WHERE sku = 'GL26' LIMIT 1;
  
  -- 3. Obtener ID del Ángulo Interior Nogal Oscuro
  SELECT id INTO v_angulo_id FROM products WHERE name LIKE '%Ángulo Interior Nogal Oscuro%' LIMIT 1;
  
  -- 4. Reintegrar +15 piezas de GL26
  IF v_warehouse_id IS NOT NULL AND v_gl26_id IS NOT NULL THEN
    PERFORM adjust_warehouse_stock(
      v_gl26_id,
      v_warehouse_id,
      15,
      'ENTRADA_DEVOLUCION (Ajuste Retroactivo) — Ticket VMP-260815-013'
    );
  END IF;
  
  -- 5. Reintegrar +4 piezas de Ángulo Interior
  IF v_warehouse_id IS NOT NULL AND v_angulo_id IS NOT NULL THEN
    PERFORM adjust_warehouse_stock(
      v_angulo_id,
      v_warehouse_id,
      4,
      'ENTRADA_DEVOLUCION (Ajuste Retroactivo) — Ticket VMP-260815-013'
    );
  END IF;
END $$;
