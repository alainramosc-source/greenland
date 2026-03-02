-- =====================================================
-- FASE C: Sub-roles Admin + Crear Colaboradores
-- =====================================================

-- 1. Add sub_role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sub_role TEXT DEFAULT NULL;

-- Valid sub_roles for admins: super_admin, warehouse_admin, accountant, viewer
-- Distributors keep sub_role = NULL

-- 2. Set current admin(s) as super_admin
UPDATE profiles SET sub_role = 'super_admin' WHERE role = 'admin' AND sub_role IS NULL;

-- 3. RPC to create admin collaborator (only super_admin can call)
CREATE OR REPLACE FUNCTION create_admin_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_sub_role TEXT DEFAULT 'viewer'
)
RETURNS JSONB AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_sub_role TEXT;
    v_new_user_id UUID;
BEGIN
    -- Check caller is super_admin
    SELECT role, sub_role INTO v_caller_role, v_caller_sub_role
    FROM profiles WHERE id = auth.uid();

    IF v_caller_role != 'admin' OR v_caller_sub_role != 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solo el super administrador puede crear colaboradores');
    END IF;

    -- Validate sub_role
    IF p_sub_role NOT IN ('super_admin', 'warehouse_admin', 'accountant', 'viewer') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sub-rol no válido');
    END IF;

    -- Create auth user via admin API (this requires service_role key)
    -- Since we can't use admin API from client, we'll create via auth.users insert
    -- Alternative: use Supabase Edge Function. For now, return instructions.

    -- Actually, we'll handle user creation client-side with supabase.auth.signUp()
    -- and then update the profile here
    RETURN jsonb_build_object('success', true, 'message', 'Use client-side signUp');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC to update sub_role (only super_admin)
CREATE OR REPLACE FUNCTION update_user_sub_role(
    p_user_id UUID,
    p_sub_role TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_sub_role TEXT;
BEGIN
    SELECT sub_role INTO v_caller_sub_role
    FROM profiles WHERE id = auth.uid() AND role = 'admin';

    IF v_caller_sub_role != 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solo el super administrador puede cambiar roles');
    END IF;

    IF p_sub_role NOT IN ('super_admin', 'warehouse_admin', 'accountant', 'viewer') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sub-rol no válido');
    END IF;

    UPDATE profiles SET sub_role = p_sub_role WHERE id = p_user_id AND role = 'admin';

    -- Audit log
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'sub_role_changed', 'profile', p_user_id,
        jsonb_build_object('new_sub_role', p_sub_role));

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_user_sub_role TO authenticated;
