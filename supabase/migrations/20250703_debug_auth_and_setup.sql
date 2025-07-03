-- Debug and setup proper auth

-- 1. Check if RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('admin_tokens', 'admin_users', 'managed_repositories', 'repository_permissions', 'admin_audit_log');

-- 2. Ensure RLS is enabled
ALTER TABLE admin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Create a test function to check auth
CREATE OR REPLACE FUNCTION test_auth()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id uuid;
    v_is_admin boolean;
BEGIN
    v_user_id := auth.uid();
    
    v_is_admin := EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = v_user_id 
        AND is_active = true
    );
    
    RETURN json_build_object(
        'user_id', v_user_id,
        'is_admin', v_is_admin,
        'timestamp', now()
    );
END;
$$;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION test_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION store_admin_token(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_repositories() TO authenticated;