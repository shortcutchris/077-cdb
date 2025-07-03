-- Clean up all existing policies and recreate them properly

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admin users full access to own tokens" ON admin_tokens;
DROP POLICY IF EXISTS "Admins can manage all tokens" ON admin_tokens;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Users can check admin status" ON admin_users;
DROP POLICY IF EXISTS "Admins can sync repositories" ON managed_repositories;
DROP POLICY IF EXISTS "Admins can view repositories" ON managed_repositories;
DROP POLICY IF EXISTS "Users can view repositories they have access to" ON managed_repositories;

-- Create new policies

-- 1. admin_tokens: Admins can manage tokens
CREATE POLICY "admin_tokens_admin_access"
ON admin_tokens
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- 2. admin_users: Users can check if they are admin
CREATE POLICY "admin_users_self_check"
ON admin_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. managed_repositories: Admins can manage all
CREATE POLICY "managed_repositories_admin_access"
ON managed_repositories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- 4. repository_permissions: Admins can manage all
CREATE POLICY "repository_permissions_admin_access"
ON repository_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- 5. admin_audit_log: Admins can view logs
CREATE POLICY "admin_audit_log_admin_access"
ON admin_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);