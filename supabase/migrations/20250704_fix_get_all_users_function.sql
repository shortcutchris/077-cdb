-- Fix get_all_users function with proper schema
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return all users from auth schema
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

-- Add comment
COMMENT ON FUNCTION public.get_all_users() IS 'Returns all users from auth schema (admin only)';