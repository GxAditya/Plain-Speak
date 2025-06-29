/*
  # Fix Infinite Recursion in Profiles Table Policies

  1. Problem
    - Infinite recursion detected in RLS policies for the profiles table
    - Multiple conflicting policies causing circular dependencies
    - Authentication failing due to policy evaluation errors

  2. Solution
    - Drop all existing problematic policies
    - Create new simplified policies without circular references
    - Fix profile creation trigger
    - Add proper admin role checking without recursion
*/

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile except tier" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile with tier restrictions" ON profiles;

-- Create new simplified policies without recursion

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (((jwt() ->> 'user_metadata'::text))::jsonb ->> 'role'::text) = 'admin'::text OR (uid() = id));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (uid() = id);

-- Users can insert own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (((jwt() ->> 'user_metadata'::text))::jsonb ->> 'role'::text) = 'admin'::text);

-- Fix the role/tier protection function to avoid recursion
CREATE OR REPLACE FUNCTION prevent_role_tier_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip check for system-level operations
  IF current_setting('role') = 'rls_enforcer' THEN
    RETURN NEW;
  END IF;

  -- For INSERT operations, allow all fields
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Check if user is admin via JWT metadata
  IF ((current_setting('request.jwt.claims', true)::jsonb ->> 'user_metadata')::jsonb ->> 'role') = 'admin' THEN
    RETURN NEW;
  END IF;
  
  -- For non-admins, preserve original role and user_tier
  IF TG_OP = 'UPDATE' THEN
    NEW.role = OLD.role;
    NEW.user_tier = OLD.user_tier;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, preserve original values for safety
    IF TG_OP = 'UPDATE' THEN
      NEW.role = OLD.role;
      NEW.user_tier = OLD.user_tier;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS protect_role_tier_changes ON profiles;
CREATE TRIGGER protect_role_tier_changes
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_tier_changes();

-- Fix profile creation function to be more robust
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Create new profile
  BEGIN
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
      NEW.id,
      NEW.email,
      'user',
      'free',
      false,
      0,
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists (race condition), ignore
      NULL;
    WHEN OTHERS THEN
      -- Log error but don't fail the auth operation
      RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Create a function to sync user role to auth metadata
CREATE OR REPLACE FUNCTION sync_role_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync on role changes
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error syncing role to auth metadata for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync role changes to auth metadata
DROP TRIGGER IF EXISTS sync_role_to_auth_metadata ON profiles;
CREATE TRIGGER sync_role_to_auth_metadata
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_auth_metadata();

-- Ensure all existing users have profiles
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email 
    FROM auth.users 
    WHERE id NOT IN (SELECT id FROM profiles)
  LOOP
    BEGIN
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
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- Ignore if profile already exists
        NULL;
    END;
  END LOOP;
END $$;

-- Sync existing roles to auth metadata
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id, role FROM profiles
  LOOP
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', profile_record.role)
    WHERE id = profile_record.id;
  END LOOP;
END $$;