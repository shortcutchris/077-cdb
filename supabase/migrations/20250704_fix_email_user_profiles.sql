-- Fix email signup to create profiles
-- This migration ensures that users who sign up via email get a profile created

-- 1. First, create profiles for existing email users who don't have one
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
  AND u.email IS NOT NULL;

-- 2. Update the handle_new_user function to create profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create profile for the new user
  INSERT INTO profiles (
    id,
    email,
    github_username,
    full_name,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'user_name',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );

  -- Log the signup (with exception handling)
  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the signup
      RAISE WARNING 'Failed to log signup for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 3. Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();