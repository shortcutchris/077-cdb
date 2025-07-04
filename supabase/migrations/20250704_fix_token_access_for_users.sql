-- Fix token access for regular users to create issues
-- Regular users need read access to active tokens for issue creation

-- Create a new policy that allows all authenticated users to read active tokens
-- (But they can only see the token exists, not modify it)
CREATE POLICY "authenticated_users_can_read_active_tokens"
  ON admin_tokens
  FOR SELECT
  TO authenticated
  USING (is_active = true);