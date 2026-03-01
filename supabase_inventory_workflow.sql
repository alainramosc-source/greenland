-- =====================================================
-- FASE B: Workflow + Ajustes Automáticos
-- =====================================================

-- RPC: Advance session workflow (submit / approve)
CREATE OR REPLACE FUNCTION advance_count_session(
    p_session_id UUID,
    p_action TEXT  -- 'submit', 'approve', 'post'
)
RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_line RECORD;
    v_current_stock INT;
    v_adjustment INT;
BEGIN
    -- Get session
    SELECT * INTO v_session FROM inventory_count_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sesión no encontrada');
    END IF;

    -- Verify admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    -- SUBMIT: in_progress → submitted
    IF p_action = 'submit' THEN
        IF v_session.status NOT IN ('draft', 'in_progress') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Solo se puede enviar desde borrador o en progreso');
        END IF;

        -- Check at least 1 line is counted
        IF NOT EXISTS (SELECT 1 FROM inventory_count_lines WHERE session_id = p_session_id AND qty_counted IS NOT NULL) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Debe haber al menos una línea contada');
        END IF;

        UPDATE inventory_count_sessions SET
            status = 'submitted',
            submitted_at = now(),
            submitted_by = auth.uid()
        WHERE id = p_session_id;

        INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'count_submitted', 'inventory_count', p_session_id,
            jsonb_build_object('session_code', v_session.session_code));

        RETURN jsonb_build_object('success', true, 'new_status', 'submitted');
    END IF;

    -- APPROVE: submitted → approved
    IF p_action = 'approve' THEN
        IF v_session.status != 'submitted' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Solo se puede aprobar desde estado enviado');
        END IF;

        UPDATE inventory_count_sessions SET
            status = 'approved',
            approved_at = now(),
            approved_by = auth.uid()
        WHERE id = p_session_id;

        INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'count_approved', 'inventory_count', p_session_id,
            jsonb_build_object('session_code', v_session.session_code));

        RETURN jsonb_build_object('success', true, 'new_status', 'approved');
    END IF;

    -- POST: approved → posted (apply stock adjustments)
    IF p_action = 'post' THEN
        IF v_session.status != 'approved' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Solo se puede aplicar desde estado aprobado');
        END IF;

        -- Process each line with a difference
        FOR v_line IN
            SELECT cl.*, p.sku as product_sku
            FROM inventory_count_lines cl
            JOIN products p ON p.id = cl.product_id
            WHERE cl.session_id = p_session_id
              AND cl.qty_counted IS NOT NULL
              AND cl.qty_counted != cl.qty_system_snapshot
        LOOP
            -- Get current stock in warehouse
            SELECT COALESCE(stock_quantity, 0) INTO v_current_stock
            FROM warehouse_stock
            WHERE product_id = v_line.product_id AND warehouse_id = v_session.warehouse_id;

            -- If no record exists, current stock is 0
            IF NOT FOUND THEN
                v_current_stock := 0;
            END IF;

            v_adjustment := v_line.qty_counted - v_line.qty_system_snapshot;

            -- Create adjustment record (immutable audit)
            INSERT INTO inventory_adjustments (session_id, product_id, warehouse_id, qty_before, qty_after, adjustment, reason, created_by)
            VALUES (p_session_id, v_line.product_id, v_session.warehouse_id, v_current_stock, v_current_stock + v_adjustment, v_adjustment, v_line.reason, auth.uid());

            -- Update warehouse_stock
            INSERT INTO warehouse_stock (product_id, warehouse_id, stock_quantity, reserved_quantity)
            VALUES (v_line.product_id, v_session.warehouse_id, v_current_stock + v_adjustment, 0)
            ON CONFLICT (product_id, warehouse_id)
            DO UPDATE SET stock_quantity = warehouse_stock.stock_quantity + v_adjustment;

            -- Also update products.stock_quantity (total)
            UPDATE products SET stock_quantity = stock_quantity + v_adjustment WHERE id = v_line.product_id;
        END LOOP;

        -- Mark session as posted
        UPDATE inventory_count_sessions SET
            status = 'posted',
            posted_at = now(),
            posted_by = auth.uid()
        WHERE id = p_session_id;

        INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'count_posted', 'inventory_count', p_session_id,
            jsonb_build_object('session_code', v_session.session_code, 'adjustments_applied', true));

        RETURN jsonb_build_object('success', true, 'new_status', 'posted');
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Acción no válida');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION advance_count_session TO authenticated;
