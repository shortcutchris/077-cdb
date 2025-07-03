-- Create log_admin_action function
CREATE OR REPLACE FUNCTION log_admin_action(
    action text,
    details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = auth.uid() 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Insert log entry
    INSERT INTO admin_audit_log (
        admin_user_id,
        action,
        details,
        created_at
    ) VALUES (
        auth.uid(),
        action,
        details,
        now()
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_admin_action(text, jsonb) TO authenticated;