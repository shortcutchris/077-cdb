-- Fix all admin-related RLS policies

-- 1. Fix admin_tokens policies
DROP POLICY IF EXISTS "Admin users full access to own tokens" ON admin_tokens;
DROP POLICY IF EXISTS "Admins can manage all tokens" ON admin_tokens;

-- Create single clear policy for admin_tokens
CREATE POLICY "Admins can manage tokens"
ON admin_tokens
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- 2. Fix admin_users policies
DROP POLICY IF EXISTS "Users can read admin status" ON admin_users;
DROP POLICY IF EXISTS "Users can check their admin status" ON admin_users;
DROP POLICY IF EXISTS "Users can read their own admin status" ON admin_users;

-- Allow authenticated users to check if they are admins
CREATE POLICY "Users can check admin status"
ON admin_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Fix managed_repositories policies
DROP POLICY IF EXISTS "Users can read repositories" ON managed_repositories;
DROP POLICY IF EXISTS "Admins can manage repositories" ON managed_repositories;

-- Admins can manage all repositories
CREATE POLICY "Admins can manage repositories"
ON managed_repositories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Users can read repositories they have access to
CREATE POLICY "Users can read accessible repositories"
ON managed_repositories
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM repository_permissions 
    WHERE repository_full_name = managed_repositories.repository_full_name
    AND user_id = auth.uid()
    AND can_create_issues = true
  )
);

-- 4. Ensure service role bypass
ALTER TABLE admin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;