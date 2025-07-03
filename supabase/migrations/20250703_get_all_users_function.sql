-- Function to get all users for admin interface
-- Since we can't directly access auth.users from the client,
-- we need an RPC function

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id uuid,
    email text,
    created_at timestamptz,
    last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow admin users to call this function
    IF NOT EXISTS (
        SELECT 1
        FROM admin_users
        WHERE user_id = auth.uid()
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Return user data from auth.users
    RETURN QUERY
    SELECT 
        au.id,
        au.email::text,
        au.created_at,
        au.last_sign_in_at
    FROM auth.users au
    ORDER BY au.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (function checks admin status internally)
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;