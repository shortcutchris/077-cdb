-- Update sync_repositories function to use Edge Function
CREATE OR REPLACE FUNCTION sync_repositories()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id uuid;
  v_token_count int;
  v_result json;
BEGIN
  -- Get the current user ID
  v_admin_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = v_admin_user_id 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Check if there are any active tokens
  SELECT COUNT(*) INTO v_token_count
  FROM admin_tokens
  WHERE admin_user_id = v_admin_user_id
  AND is_active = true;
  
  IF v_token_count = 0 THEN
    RAISE EXCEPTION 'No active tokens found. Please add a GitHub Personal Access Token first.';
  END IF;
  
  -- Return success message
  -- The actual sync will be handled by the Edge Function called from the frontend
  v_result := json_build_object(
    'success', true,
    'message', 'Repository sync can be initiated. Please wait for the sync to complete.',
    'token_count', v_token_count
  );
  
  RETURN v_result;
END;
$$;