-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admin users can manage tokens" ON admin_tokens;
DROP POLICY IF EXISTS "Admin users can view their tokens" ON admin_tokens;
DROP POLICY IF EXISTS "Admin users can insert tokens" ON admin_tokens;
DROP POLICY IF EXISTS "Admin users can update tokens" ON admin_tokens;
DROP POLICY IF EXISTS "Admin users can delete tokens" ON admin_tokens;

-- Create comprehensive policy for admin users to manage their tokens
CREATE POLICY "Admin users full access to own tokens"
ON admin_tokens
FOR ALL
TO authenticated
USING (
  admin_user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
)
WITH CHECK (
  admin_user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);