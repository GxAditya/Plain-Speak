/*
  # Fix Authentication and Profile Creation Issues

  This migration fixes the infinite recursion in RLS policies and ensures proper
  profile creation for all users.

  ## Changes Made
  1. Drop problematic policies that caused recursion
  2. Create simplified RLS policies using auth metadata
  3. Fix profile creation triggers
  4. Add helper functions for safe profile access
  5. Ensure all existing users have profiles
*/

-- Drop existing problematic policies and triggers
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile except tier" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP TRIGGER IF EXISTS protect_role_tier_changes ON profiles;
DROP FUNCTION IF EXISTS prevent_role_tier_changes();

-- Create simplified RLS policies without recursion

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (role/tier protection handled by trigger)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for profile creation)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles (using auth metadata to avoid recursion)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user is admin via auth metadata or is viewing own profile
    (auth.jwt()::jsonb ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    auth.uid() = id
  );

-- Admins can update any profile (using auth metadata)
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt()::jsonb ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt()::jsonb ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- Create function to prevent non-admins from changing role and user_tier
CREATE OR REPLACE FUNCTION prevent_role_tier_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT operations, allow all fields
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- For UPDATE operations, check if user is admin
  -- Use auth metadata to avoid recursion
  IF (auth.jwt()::jsonb ->> 'user_metadata')::jsonb ->> 'role' = 'admin' THEN
    RETURN NEW;
  END IF;
  
  -- For non-admins, preserve original role and user_tier
  IF TG_OP = 'UPDATE' THEN
    NEW.role = OLD.role;
    NEW.user_tier = OLD.user_tier;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce role/tier protection
CREATE TRIGGER protect_role_tier_changes
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_tier_changes();

-- Create or replace the profile creation trigger function
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    user_tier,
    has_gemini_key,
    daily_uploads_count,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    'user',
    'free',
    false,
    0,
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth operation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Create function to safely get or create user profile
CREATE OR REPLACE FUNCTION get_or_create_user_profile(user_id uuid)
RETURNS profiles AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  user_email text;
BEGIN
  -- Try to get existing profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id;
  
  -- If profile exists, return it
  IF FOUND THEN
    RETURN user_profile;
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  -- Create new profile if it doesn't exist
  INSERT INTO profiles (
    id,
    email,
    role,
    user_tier,
    has_gemini_key,
    daily_uploads_count,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    COALESCE(user_email, 'unknown@example.com'),
    'user',
    'free',
    false,
    0,
    NOW(),
    NOW()
  ) RETURNING * INTO user_profile;
  
  RETURN user_profile;
EXCEPTION
  WHEN OTHERS THEN
    -- If insert fails, try to get the profile again (race condition)
    SELECT * INTO user_profile
    FROM profiles
    WHERE id = user_id;
    
    IF FOUND THEN
      RETURN user_profile;
    END IF;
    
    -- If still not found, raise error
    RAISE EXCEPTION 'Failed to create or retrieve profile for user %: %', user_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_or_create_user_profile(uuid) TO authenticated;

-- Update existing users to have profiles if they don't already
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email 
    FROM auth.users 
    WHERE id NOT IN (SELECT id FROM profiles)
  LOOP
    INSERT INTO profiles (
      id,
      email,
      role,
      user_tier,
      has_gemini_key,
      daily_uploads_count,
      created_at,
      updated_at
    ) VALUES (
      user_record.id,
      user_record.email,
      'user',
      'free',
      false,
      0,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- Create function to update user metadata in auth.users (for admin detection)
CREATE OR REPLACE FUNCTION update_user_metadata(user_id uuid, new_role text)
RETURNS boolean AS $$
BEGIN
  -- Only allow admins to update metadata
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN false;
  END IF;
  
  -- Update the user's metadata in auth.users
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE id = user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to service role only
GRANT EXECUTE ON FUNCTION update_user_metadata(uuid, text) TO service_role;

-- Create a view for safe profile access
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  id,
  email,
  role,
  user_tier,
  full_name,
  avatar_url,
  preferences,
  has_gemini_key,
  daily_uploads_count,
  last_upload_date,
  created_at,
  updated_at
FROM profiles
WHERE auth.uid() = id OR EXISTS (
  SELECT 1 FROM profiles admin_check
  WHERE admin_check.id = auth.uid() 
  AND admin_check.role = 'admin'
);

-- Grant access to the view
GRANT SELECT ON user_profiles TO authenticated;