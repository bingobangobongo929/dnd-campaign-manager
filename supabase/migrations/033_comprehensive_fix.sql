-- ============================================
-- COMPREHENSIVE FIX: User Settings, Triggers, Buckets, Cleanup
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ENSURE ALL USER_SETTINGS COLUMNS EXIST
-- ============================================

-- Basic columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'anthropic';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- GDPR columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;

-- Account status columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS suspended_by UUID DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS suspended_reason TEXT DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS disabled_by UUID DEFAULT NULL;

-- 2FA columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS totp_secret TEXT DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS backup_codes TEXT[] DEFAULT NULL;

-- Email/invite columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS invited_by UUID DEFAULT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS invite_code_used TEXT DEFAULT NULL;

-- Avatar column
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- Timestamps
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 2. FIX CONSTRAINTS (drop and recreate)
-- ============================================

ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_tier_check;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_role_check;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_ai_provider_check;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_theme_check;

-- Only add constraints if they don't cause issues with existing data
DO $$
BEGIN
  -- Update any NULL values first
  UPDATE user_settings SET tier = 'free' WHERE tier IS NULL;
  UPDATE user_settings SET role = 'user' WHERE role IS NULL;
  UPDATE user_settings SET ai_provider = 'anthropic' WHERE ai_provider IS NULL;
  UPDATE user_settings SET theme = 'dark' WHERE theme IS NULL;

  -- Now add constraints
  ALTER TABLE user_settings ADD CONSTRAINT user_settings_tier_check
    CHECK (tier IN ('free', 'standard', 'premium'));
  ALTER TABLE user_settings ADD CONSTRAINT user_settings_role_check
    CHECK (role IN ('user', 'moderator', 'super_admin'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraints may already exist or data mismatch';
END $$;

-- ============================================
-- 3. RECREATE TRIGGER FUNCTION (ROBUST VERSION)
-- ============================================

CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (
    user_id,
    role,
    tier,
    ai_provider,
    theme,
    totp_enabled,
    marketing_consent,
    email_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'user',
    'free',
    'anthropic',
    'dark',
    FALSE,
    FALSE,
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Failed to create user_settings for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_settings();

-- ============================================
-- 4. STORAGE BUCKET POLICIES WITH SIZE LIMITS
-- ============================================

-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('character-images', 'character-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('vault-images', 'vault-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('campaign-images', 'campaign-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('world-maps', 'world-maps', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('media-gallery', 'media-gallery', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('oneshot-images', 'oneshot-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 5. STORAGE USAGE TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bucket_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_storage_usage_user ON storage_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_usage_bucket ON storage_usage(bucket_id);

-- Enable RLS
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own storage usage
CREATE POLICY "Users can view own storage usage" ON storage_usage
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 6. USER STORAGE QUOTA VIEW
-- ============================================

CREATE OR REPLACE VIEW user_storage_summary AS
SELECT
  user_id,
  bucket_id,
  COUNT(*) as file_count,
  SUM(file_size) as total_bytes,
  ROUND(SUM(file_size) / 1048576.0, 2) as total_mb
FROM storage_usage
GROUP BY user_id, bucket_id;

-- Total per user
CREATE OR REPLACE VIEW user_storage_total AS
SELECT
  user_id,
  COUNT(*) as total_files,
  SUM(file_size) as total_bytes,
  ROUND(SUM(file_size) / 1048576.0, 2) as total_mb
FROM storage_usage
GROUP BY user_id;

-- ============================================
-- 7. ORPHANED FILES TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS orphaned_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE(bucket_id, file_path)
);

-- ============================================
-- 8. FUNCTION TO CHECK FOR ORPHANED FILES
-- This should be called periodically (e.g., daily cron)
-- ============================================

CREATE OR REPLACE FUNCTION find_orphaned_images()
RETURNS TABLE(bucket TEXT, path TEXT) AS $$
DECLARE
  storage_file RECORD;
BEGIN
  -- This is a placeholder - actual implementation requires
  -- comparing storage.objects against all image URL columns
  -- in your database tables

  -- For now, return empty - implement based on your needs
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. API RATE LIMITING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Get current rate limit record
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits WHERE key = p_key;

  IF v_window_start IS NULL OR v_window_start < NOW() - (p_window_seconds || ' seconds')::INTERVAL THEN
    -- Start new window
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, NOW())
    ON CONFLICT (key) DO UPDATE SET count = 1, window_start = NOW();
    RETURN TRUE;
  ELSIF v_count < p_limit THEN
    -- Increment count
    UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
    RETURN TRUE;
  ELSE
    -- Rate limited
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. SCHEDULED CLEANUP (requires pg_cron extension)
-- Note: pg_cron may not be available on free tier
-- ============================================

-- If pg_cron is available:
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_rate_limits()');

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON user_storage_summary TO authenticated;
GRANT SELECT ON user_storage_total TO authenticated;

-- ============================================
-- DONE! Run this entire script in Supabase SQL Editor
-- ============================================
