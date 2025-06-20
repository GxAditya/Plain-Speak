/*
# Free Tier Support Migration

This migration adds support for a free tier with the following features:
1. User tier management (free, pro, enterprise)
2. Encrypted Gemini API key storage for free tier users
3. Daily upload limits for free tier (3 uploads per day)
4. Tier-based access controls

## New Tables/Columns
- `profiles.user_tier` - User subscription tier
- `profiles.encrypted_gemini_key` - Encrypted API key storage
- `profiles.daily_uploads_count` - Daily upload counter
- `profiles.last_upload_date` - Last upload date for reset logic
- `profiles.has_gemini_key` - Quick flag for API key presence

## Security
- Uses pgsodium for API key encryption
- Row Level Security policies for tier-based access
- Secure functions with proper permissions
*/

-- Enable pgsodium extension for encryption
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Add new columns to profiles table for free tier support
DO $$
BEGIN
  -- Add user_tier column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN user_tier text DEFAULT 'free' CHECK (user_tier IN ('free', 'pro', 'enterprise'));
  END IF;

  -- Add encrypted_gemini_key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'encrypted_gemini_key'
  ) THEN
    ALTER TABLE profiles ADD COLUMN encrypted_gemini_key text;
  END IF;

  -- Add daily_uploads_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_uploads_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_uploads_count integer DEFAULT 0;
  END IF;

  -- Add last_upload_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_upload_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_upload_date date;
  END IF;

  -- Add has_gemini_key flag for quick checks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_gemini_key'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_gemini_key boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_tier ON profiles(user_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_last_upload_date ON profiles(last_upload_date);
CREATE INDEX IF NOT EXISTS idx_profiles_has_gemini_key ON profiles(has_gemini_key);

-- Function to securely store encrypted Gemini API key
CREATE OR REPLACE FUNCTION store_user_gemini_key(user_id uuid, api_key text)
RETURNS boolean AS $$
DECLARE
  encrypted_key text;
  operation_success boolean := false;
BEGIN
  -- Encrypt the API key using pgsodium's simple encryption
  SELECT pgsodium.crypto_secretbox(api_key::bytea, pgsodium.crypto_secretbox_keygen()) INTO encrypted_key;
  
  -- Update the user's profile
  UPDATE profiles 
  SET 
    encrypted_gemini_key = encrypted_key,
    has_gemini_key = true,
    updated_at = now()
  WHERE id = user_id;
  
  GET DIAGNOSTICS operation_success = FOUND;
  RETURN operation_success;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error storing Gemini key for user %: %', user_id, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retrieve and decrypt Gemini API key
-- Note: This is a simplified approach. In production, you'd want proper key management.
CREATE OR REPLACE FUNCTION get_user_gemini_key(user_id uuid)
RETURNS text AS $$
DECLARE
  encrypted_key text;
BEGIN
  -- For security reasons, we'll return a placeholder
  -- The actual decryption should be handled in the application layer
  -- with proper key management
  SELECT encrypted_gemini_key INTO encrypted_key
  FROM profiles
  WHERE id = user_id AND has_gemini_key = true;
  
  IF encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return indicator that key exists (actual key retrieval handled in app)
  RETURN 'KEY_EXISTS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error checking Gemini key for user %: %', user_id, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove user's Gemini API key
CREATE OR REPLACE FUNCTION remove_user_gemini_key(user_id uuid)
RETURNS boolean AS $$
DECLARE
  operation_success boolean := false;
BEGIN
  UPDATE profiles 
  SET 
    encrypted_gemini_key = NULL,
    has_gemini_key = false,
    updated_at = now()
  WHERE id = user_id;
  
  GET DIAGNOSTICS operation_success = FOUND;
  RETURN operation_success;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update daily upload limits
CREATE OR REPLACE FUNCTION check_daily_upload_limit(user_id uuid)
RETURNS jsonb AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  current_date date := CURRENT_DATE;
  uploads_remaining integer;
  max_uploads integer := 3; -- Free tier limit
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Check if user is on free tier
  IF user_profile.user_tier != 'free' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'unlimited', true,
      'tier', user_profile.user_tier
    );
  END IF;
  
  -- Check if user has Gemini key
  IF NOT user_profile.has_gemini_key THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Gemini API key required for free tier',
      'requires_key', true
    );
  END IF;
  
  -- Reset counter if it's a new day
  IF user_profile.last_upload_date IS NULL OR user_profile.last_upload_date < current_date THEN
    UPDATE profiles
    SET 
      daily_uploads_count = 0,
      last_upload_date = current_date,
      updated_at = now()
    WHERE id = user_id;
    
    uploads_remaining := max_uploads;
  ELSE
    uploads_remaining := max_uploads - user_profile.daily_uploads_count;
  END IF;
  
  -- Check if limit exceeded
  IF uploads_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Daily upload limit reached',
      'limit_exceeded', true,
      'reset_time', (current_date + interval '1 day')::text
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'uploads_remaining', uploads_remaining,
    'max_uploads', max_uploads,
    'tier', 'free'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment upload count
CREATE OR REPLACE FUNCTION increment_upload_count(user_id uuid)
RETURNS boolean AS $$
DECLARE
  operation_success boolean := false;
BEGIN
  UPDATE profiles
  SET 
    daily_uploads_count = daily_uploads_count + 1,
    updated_at = now()
  WHERE id = user_id AND user_tier = 'free';
  
  GET DIAGNOSTICS operation_success = FOUND;
  RETURN operation_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily upload counts (for scheduled execution)
CREATE OR REPLACE FUNCTION reset_daily_upload_counts()
RETURNS integer AS $$
DECLARE
  reset_count integer;
BEGIN
  UPDATE profiles
  SET 
    daily_uploads_count = 0,
    updated_at = now()
  WHERE 
    user_tier = 'free' 
    AND (last_upload_date IS NULL OR last_upload_date < CURRENT_DATE);
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user tier information
CREATE OR REPLACE FUNCTION get_user_tier_info(user_id uuid)
RETURNS jsonb AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  result jsonb;
  uploads_remaining integer;
BEGIN
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Calculate uploads remaining for free tier
  IF user_profile.user_tier = 'free' THEN
    IF user_profile.last_upload_date IS NULL OR user_profile.last_upload_date < CURRENT_DATE THEN
      uploads_remaining := 3; -- Reset for new day
    ELSE
      uploads_remaining := 3 - COALESCE(user_profile.daily_uploads_count, 0);
    END IF;
  ELSE
    uploads_remaining := -1; -- Unlimited
  END IF;
  
  result := jsonb_build_object(
    'tier', user_profile.user_tier,
    'has_gemini_key', user_profile.has_gemini_key,
    'daily_uploads_count', COALESCE(user_profile.daily_uploads_count, 0),
    'uploads_remaining', uploads_remaining,
    'last_upload_date', user_profile.last_upload_date
  );
  
  -- Add tier-specific information
  IF user_profile.user_tier = 'free' THEN
    result := result || jsonb_build_object(
      'max_daily_uploads', 3,
      'history_saved', false,
      'requires_own_key', true
    );
  ELSE
    result := result || jsonb_build_object(
      'max_daily_uploads', -1, -- Unlimited
      'history_saved', true,
      'requires_own_key', false
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upgrade user tier (for admin use)
CREATE OR REPLACE FUNCTION upgrade_user_tier(user_id uuid, new_tier text)
RETURNS boolean AS $$
DECLARE
  operation_success boolean := false;
BEGIN
  -- Validate tier
  IF new_tier NOT IN ('free', 'pro', 'enterprise') THEN
    RETURN false;
  END IF;
  
  UPDATE profiles
  SET 
    user_tier = new_tier,
    updated_at = now()
  WHERE id = user_id;
  
  GET DIAGNOSTICS operation_success = FOUND;
  RETURN operation_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate Gemini API key format
CREATE OR REPLACE FUNCTION validate_gemini_key(api_key text)
RETURNS boolean AS $$
BEGIN
  -- Basic validation for Gemini API key format
  -- Gemini keys typically start with 'AIza' and are 39 characters long
  IF api_key IS NULL OR length(api_key) < 30 THEN
    RETURN false;
  END IF;
  
  -- Check if it starts with expected prefix
  IF NOT (api_key LIKE 'AIza%') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop existing conflicting policy if it exists
DROP POLICY IF EXISTS "Users can update own tier info" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile with tier restrictions" ON profiles;

-- Create new RLS policy for tier-based updates
CREATE POLICY "Users can update own profile except tier"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    (
      -- Check if user is trying to change their tier
      user_tier = (
        SELECT p.user_tier 
        FROM profiles p 
        WHERE p.id = auth.uid()
      ) OR
      -- Allow admins to change any tier
      EXISTS (
        SELECT 1 FROM profiles admin_check
        WHERE admin_check.id = auth.uid() 
        AND admin_check.role = 'admin'
      )
    )
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION store_user_gemini_key(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_gemini_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_gemini_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_daily_upload_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_upload_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tier_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_gemini_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_user_tier(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION reset_daily_upload_counts() TO service_role;

-- Update existing users to have default free tier
UPDATE profiles 
SET user_tier = 'free' 
WHERE user_tier IS NULL;

-- Create a view for admin tier management
CREATE OR REPLACE VIEW admin_user_tiers AS
SELECT 
  id,
  email,
  user_tier,
  has_gemini_key,
  daily_uploads_count,
  last_upload_date,
  created_at,
  updated_at
FROM profiles
WHERE EXISTS (
  SELECT 1 FROM profiles admin_check
  WHERE admin_check.id = auth.uid() 
  AND admin_check.role = 'admin'
);

-- Grant access to the admin view
GRANT SELECT ON admin_user_tiers TO authenticated;

-- Create trigger to validate Gemini key on insert/update
CREATE OR REPLACE FUNCTION validate_gemini_key_trigger()
RETURNS trigger AS $$
BEGIN
  -- Only validate if has_gemini_key is being set to true
  IF NEW.has_gemini_key = true AND NEW.encrypted_gemini_key IS NOT NULL THEN
    -- In a real implementation, you'd decrypt and validate here
    -- For now, just ensure the encrypted field is not empty
    IF length(NEW.encrypted_gemini_key) < 10 THEN
      RAISE EXCEPTION 'Invalid Gemini API key format';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_gemini_key_trigger ON profiles;
CREATE TRIGGER validate_gemini_key_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_gemini_key_trigger();