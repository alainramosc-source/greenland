-- FIX: Update receive_order to also allow admins
CREATE OR REPLACE FUNCTION receive_order(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if caller is admin
    SELECT (role = 'admin') INTO v_is_admin FROM profiles WHERE id = auth.uid();

    -- Verify order exists and is shipped
    -- Allow: distributor who owns the order OR admin
    SELECT * INTO v_order FROM orders
    WHERE id = p_order_id AND status = 'shipped'
    AND (distributor_id = auth.uid() OR v_is_admin = true);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado o no está en estado Enviado');
    END IF;

    -- Add each item to distributor inventory (use the order's distributor_id, not auth.uid())
    FOR v_item IN
        SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
    LOOP
        INSERT INTO distributor_inventory (distributor_id, product_id, stock, updated_at)
        VALUES (v_order.distributor_id, v_item.product_id, v_item.quantity, now())
        ON CONFLICT (distributor_id, product_id)
        DO UPDATE SET
            stock = distributor_inventory.stock + v_item.quantity,
            updated_at = now();
    END LOOP;

    -- Update order status to closed
    UPDATE orders SET status = 'closed', delivered_at = now() WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'message', 'Pedido recibido y stock actualizado');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
