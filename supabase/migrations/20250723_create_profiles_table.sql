-- Create profiles table that was missing
-- This table is referenced by the handle_new_user trigger but was never created

-- Create the profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  github_username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Service role (used by triggers) can insert/update profiles
CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert profiles for existing users
INSERT INTO profiles (id, email, github_username, full_name, avatar_url, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'user_name',
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
  u.raw_user_meta_data->>'avatar_url',
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
  AND u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Fix the handle_new_user function to handle errors better
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
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    github_username = COALESCE(EXCLUDED.github_username, profiles.github_username),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();

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
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup completely
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();