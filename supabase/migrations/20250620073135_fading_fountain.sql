/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Multiple conflicting UPDATE policies on profiles table
    - Policies with WITH CHECK clauses that reference the profiles table itself
    - This creates infinite recursion when Supabase evaluates the policies

  2. Solution
    - Drop the problematic policies
    - Create simplified, non-recursive policies
    - Ensure policies don't reference the profiles table in their conditions

  3. New Policies
    - Users can read their own profile
    - Users can update their own profile (except role and user_tier)
    - Admins can read all profiles
    - Admins can update any profile
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

-- Users can update their own profile (but not role or user_tier)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM auth.users WHERE id = auth.uid()) AND
    user_tier = OLD.user_tier
  );

-- Admins can read all profiles (check admin status via auth metadata)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata' ->> 'role') = 'admin' OR
    auth.uid() = id
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata' ->> 'role') = 'admin');

-- Users can insert their own profile (for profile creation)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);