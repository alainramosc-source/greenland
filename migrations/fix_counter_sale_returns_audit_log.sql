-- Migration: Update adjust_warehouse_stock to log to audit_log and backfill VMP-260825-017 return

-- 1. Update adjust_warehouse_stock to log into both inventory_logs AND audit_log
CREATE OR REPLACE FUNCTION adjust_warehouse_stock(
  p_product_id UUID,
  p_warehouse_id UUID,
  p_quantity_change INT,
  p_reason TEXT DEFAULT 'Manual adjustment',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_sku TEXT;
  v_wh_name TEXT;
  v_old_stock INT;
  v_new_stock INT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Get current stock
  SELECT COALESCE(stock_quantity, 0) INTO v_old_stock
  FROM warehouse_stock
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id;
  
  v_old_stock := COALESCE(v_old_stock, 0);

  -- Upsert warehouse_stock
  INSERT INTO warehouse_stock (warehouse_id, product_id, stock_quantity, reserved_quantity)
  VALUES (p_warehouse_id, p_product_id, GREATEST(p_quantity_change, 0), 0)
  ON CONFLICT (warehouse_id, product_id) DO UPDATE
  SET stock_quantity = GREATEST(warehouse_stock.stock_quantity + p_quantity_change, 0),
      updated_at = now();

  -- Get new stock, SKU, warehouse name
  SELECT stock_quantity INTO v_new_stock FROM warehouse_stock WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id;
  SELECT sku INTO v_sku FROM products WHERE id = p_product_id;
  SELECT name INTO v_wh_name FROM warehouses WHERE id = p_warehouse_id;
  
  -- Log in inventory_logs
  INSERT INTO inventory_logs (user_id, product_id, quantity_change, reason)
  VALUES (v_user_id, p_product_id, p_quantity_change, p_reason || ' [Bodega: ' || COALESCE(v_wh_name, 'Desconocida') || ']');
  
  -- Log in audit_log for /dashboard/auditoria
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    CASE WHEN p_quantity_change >= 0 THEN 'stock_increase' ELSE 'stock_decrease' END,
    'warehouse_stock',
    p_product_id,
    jsonb_build_object(
      'sku', COALESCE(v_sku, ''),
      'warehouse', COALESCE(v_wh_name, ''),
      'before', v_old_stock,
      'after', v_new_stock,
      'change', p_quantity_change,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Backfill audit_log entries for cancelled counter sales that returned inventory
DO $$
DECLARE
  r RECORD;
  item JSONB;
  v_pid UUID;
  v_sku TEXT;
  v_wh_name TEXT;
  v_user_id UUID;
BEGIN
  FOR r IN 
    SELECT cs.id, cs.sale_number, cs.warehouse_id, cs.items, cs.cancelled_by, cs.approved_by, cs.cancel_reason, cs.cancelled_at, w.name as wh_name
    FROM counter_sales cs
    LEFT JOIN warehouses w ON w.id = cs.warehouse_id
    WHERE cs.status = 'cancelled'
  LOOP
    v_wh_name := COALESCE(r.wh_name, 'Bodega Vito Alessio');
    v_user_id := COALESCE(r.cancelled_by, r.approved_by);

    IF r.items IS NOT NULL THEN
      FOR item IN SELECT * FROM jsonb_array_elements(r.items)
      LOOP
        v_sku := item->>'sku';
        SELECT id INTO v_pid FROM products WHERE LOWER(sku) = LOWER(v_sku) LIMIT 1;
        
        IF v_pid IS NOT NULL THEN
          -- Check if audit log already exists for this return
          IF NOT EXISTS (
            SELECT 1 FROM audit_log 
            WHERE entity_id = v_pid 
              AND (details->>'reason') LIKE '%' || r.sale_number || '%'
          ) THEN
            INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, created_at)
            VALUES (
              v_user_id,
              'stock_increase',
              'warehouse_stock',
              v_pid,
              jsonb_build_object(
                'sku', COALESCE(v_sku, ''),
                'warehouse', v_wh_name,
                'before', 0,
                'after', (item->>'quantity')::int,
                'change', (item->>'quantity')::int,
                'reason', 'ENTRADA_DEVOLUCION — Venta Mostrador #' || r.sale_number || ' — Motivo: ' || COALESCE(r.cancel_reason, 'Devolución de venta')
              ),
              COALESCE(r.cancelled_at, now())
            );
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;
