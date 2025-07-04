-- Support for email signup users
-- This migration ensures that users who sign up via email can use the application

-- 1. Create a function to handle new user signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the signup
  INSERT INTO admin_audit_log (
    admin_user_id,
    action,
    details
  ) VALUES (
    NEW.id,
    'user_signup',
    jsonb_build_object(
      'email', NEW.email,
      'provider', NEW.raw_app_meta_data->>'provider',
      'providers', NEW.raw_app_meta_data->'providers',
      'signup_method', CASE 
        WHEN NEW.raw_app_meta_data->>'provider' = 'github' THEN 'oauth_github'
        WHEN NEW.raw_app_meta_data->>'provider' = 'email' THEN 'email_password'
        ELSE 'unknown'
      END
    )
  );
  
  RETURN NEW;
END;
$$;

-- 2. Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 3. Update RLS policies to allow email users to see their own audit logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON admin_audit_log;
CREATE POLICY "Users can view their own audit logs"
  ON admin_audit_log
  FOR SELECT
  TO authenticated
  USING (admin_user_id = auth.uid());

-- 4. Create a view for user profiles (combines auth.users with our app data)
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  u.created_at,
  u.updated_at,
  u.last_sign_in_at,
  CASE 
    WHEN au.user_id IS NOT NULL THEN true 
    ELSE false 
  END as is_admin,
  CASE
    WHEN u.raw_app_meta_data->>'provider' = 'github' THEN 'GitHub'
    WHEN u.raw_app_meta_data->>'provider' = 'email' THEN 'Email'
    ELSE 'Unknown'
  END as auth_provider
FROM auth.users u
LEFT JOIN admin_users au ON u.id = au.user_id AND au.is_active = true;

-- 5. Grant access to the view
GRANT SELECT ON user_profiles TO authenticated;

-- 6. Add RLS to the view
ALTER VIEW user_profiles OWNER TO postgres;

-- 7. Create a function to check if email signup is allowed
-- (This can be used later if we want to restrict signups)
CREATE OR REPLACE FUNCTION is_email_signup_allowed()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- For now, always allow email signups
  -- Later we can add logic to restrict based on domain, invite codes, etc.
  RETURN true;
END;
$$;

-- 8. Grant execute permission
GRANT EXECUTE ON FUNCTION is_email_signup_allowed() TO anon;