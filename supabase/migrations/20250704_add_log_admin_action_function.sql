-- Create log_admin_action function for audit logging
CREATE OR REPLACE FUNCTION public.log_admin_action(
  action text,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  admin_role text;
BEGIN
  -- Get current user
  admin_id := auth.uid();
  
  -- Check if user is admin
  SELECT role INTO admin_role
  FROM admin_users
  WHERE user_id = admin_id
  AND is_active = true;
  
  IF admin_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Insert into audit log
  INSERT INTO admin_audit_log (
    admin_user_id,
    action,
    details
  ) VALUES (
    admin_id,
    action,
    details
  );
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.log_admin_action(text, jsonb) IS 'Logs admin actions to audit table';