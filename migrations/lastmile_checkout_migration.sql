-- ============================================================
-- LASTMILE CHECKOUT — Schema Enhancement
-- Adds delivery fields to lastmile_orders + RPC for sale creation
-- ============================================================

-- 1. Add missing columns to lastmile_orders
ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('pickup', 'delivery'));
ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS customer_alt_contact TEXT;
ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS customer_alt_phone TEXT;
ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS address_ext_number TEXT;
ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS address_int_number TEXT;
ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS address_municipality TEXT;
ALTER TABLE lastmile_orders ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- 2. RPC: Create a lastmile sale from the inbox
-- This creates the lastmile_orders record, records each item as a distributor_sale, and deducts stock
CREATE OR REPLACE FUNCTION create_lastmile_sale(
  p_conversation_id UUID DEFAULT NULL,
  p_delivery_type TEXT DEFAULT 'delivery',
  p_items JSONB DEFAULT '[]',
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_token TEXT;
  v_order_number TEXT;
  v_item JSONB;
  v_subtotal NUMERIC := 0;
  v_result JSONB;
  v_stock INT;
BEGIN
  -- Generate unique token and order number
  v_token := encode(gen_random_bytes(8), 'hex');
  v_order_number := 'LM-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(v_token, 1, 4));

  -- Calculate subtotal from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + ((v_item->>'quantity')::INT * (v_item->>'sale_price')::NUMERIC);
  END LOOP;

  -- Create the lastmile order
  INSERT INTO lastmile_orders (
    distributor_id, conversation_id, checkout_token, order_number,
    delivery_type, items, subtotal, total, notes, status
  ) VALUES (
    auth.uid(), p_conversation_id, v_token, v_order_number,
    p_delivery_type, p_items, v_subtotal, v_subtotal, p_notes,
    CASE WHEN p_delivery_type = 'pickup' THEN 'confirmed' ELSE 'pending' END
  )
  RETURNING id INTO v_order_id;

  -- Record each item as a distributor sale and deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Check stock
    SELECT stock INTO v_stock FROM distributor_inventory
    WHERE distributor_id = auth.uid() AND product_id = (v_item->>'product_id')::UUID;

    IF v_stock IS NOT NULL AND v_stock >= (v_item->>'quantity')::INT THEN
      -- Record sale via existing function logic (inline to avoid nested RPC issues)
      INSERT INTO distributor_sales (
        distributor_id, product_id, quantity, sale_price, cost_price, client_name, notes
      ) VALUES (
        auth.uid(),
        (v_item->>'product_id')::UUID,
        (v_item->>'quantity')::INT,
        (v_item->>'sale_price')::NUMERIC,
        COALESCE((SELECT price FROM products WHERE id = (v_item->>'product_id')::UUID), 0),
        NULL,
        'Venta desde inbox - Orden ' || v_order_number
      );

      -- Deduct stock
      UPDATE distributor_inventory
      SET stock = stock - (v_item->>'quantity')::INT, updated_at = now()
      WHERE distributor_id = auth.uid() AND product_id = (v_item->>'product_id')::UUID;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'checkout_token', v_token,
    'order_number', v_order_number,
    'delivery_type', p_delivery_type,
    'total', v_subtotal
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_lastmile_sale TO authenticated;
