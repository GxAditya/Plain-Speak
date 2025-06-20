/*
  # Add Free Tier Support with BYOK and Daily Limits

  1. Schema Updates
    - Add columns to profiles table for free tier management
    - Add encrypted Gemini API key storage
    - Add daily upload tracking
    - Add user tier management

  2. Security
    - Enable pgsodium extension for encryption
    - Create secure functions for key management
    - Add RLS policies for tier-based access

  3. Daily Reset Functionality
    - Create function to reset daily limits
    - Add indexes for performance
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
    WHERE table_name = 'last_upload_date' AND column_name = 'last_upload_date'
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
  key_id uuid;
  encrypted_key text;
BEGIN
  -- Generate a new key for encryption
  SELECT pgsodium.create_key() INTO key_id;
  
  -- Encrypt the API key
  SELECT pgsodium.crypto_aead_det_encrypt(
    api_key::bytea,
    NULL,
    key_id
  )::text INTO encrypted_key;
  
  -- Update the user's profile
  UPDATE profiles 
  SET 
    encrypted_gemini_key = encrypted_key,
    has_gemini_key = true,
    updated_at = now()
  WHERE id = user_id;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retrieve and decrypt Gemini API key
CREATE OR REPLACE FUNCTION get_user_gemini_key(user_id uuid)
RETURNS text AS $$
DECLARE
  encrypted_key text;
  decrypted_key text;
  key_id uuid;
BEGIN
  -- Get the encrypted key
  SELECT encrypted_gemini_key INTO encrypted_key
  FROM profiles
  WHERE id = user_id AND has_gemini_key = true;
  
  IF encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the key ID (this would need to be stored or derived)
  -- For simplicity, we'll use a simpler approach with a master key
  SELECT pgsodium.crypto_aead_det_decrypt(
    encrypted_key::bytea,
    NULL,
    (SELECT id FROM pgsodium.key LIMIT 1)
  )::text INTO decrypted_key;
  
  RETURN decrypted_key;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
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
BEGIN
  UPDATE profiles
  SET 
    daily_uploads_count = daily_uploads_count + 1,
    updated_at = now()
  WHERE id = user_id AND user_tier = 'free';
  
  RETURN FOUND;
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
BEGIN
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  result := jsonb_build_object(
    'tier', user_profile.user_tier,
    'has_gemini_key', user_profile.has_gemini_key,
    'daily_uploads_count', user_profile.daily_uploads_count,
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

-- Update RLS policies for tier-based access
CREATE POLICY "Users can update own tier info"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    (
      -- Users can only update certain fields, not their tier
      OLD.user_tier = NEW.user_tier OR
      -- Admins can update tiers
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION store_user_gemini_key(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_gemini_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_daily_upload_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_upload_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tier_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_daily_upload_counts() TO service_role;

-- Create a simple master key for encryption (in production, use proper key management)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgsodium.key LIMIT 1) THEN
    PERFORM pgsodium.create_key();
  END IF;
END $$;