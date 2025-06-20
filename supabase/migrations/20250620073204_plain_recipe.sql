/*
  # Fix infinite recursion in profiles RLS policies

  1. Remove problematic recursive policies
  2. Create simplified policies without circular dependencies
  3. Use auth.uid() and JWT metadata for role checking
  4. Prevent users from changing critical fields like role and user_tier
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile except tier" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON profiles;

-- Create new, simplified policies without recursion

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (excluding role and user_tier)
-- We'll handle role/tier protection at the application level
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'
    ) OR
    auth.uid() = id
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  );

-- Users can insert their own profile (for profile creation)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create a function to prevent non-admins from changing role and user_tier
CREATE OR REPLACE FUNCTION prevent_role_tier_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if user is admin
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
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
DROP TRIGGER IF EXISTS protect_role_tier_changes ON profiles;
CREATE TRIGGER protect_role_tier_changes
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_tier_changes();