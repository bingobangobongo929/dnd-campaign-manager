-- Comprehensive migration to ensure all user_settings columns exist
-- This fixes any issues from previous migrations that may have failed

-- Add tier column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'tier') THEN
    ALTER TABLE user_settings ADD COLUMN tier TEXT NOT NULL DEFAULT 'free';
  END IF;
END $$;

-- Add role column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'role') THEN
    ALTER TABLE user_settings ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- Add GDPR columns if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'terms_accepted_at') THEN
    ALTER TABLE user_settings ADD COLUMN terms_accepted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'privacy_accepted_at') THEN
    ALTER TABLE user_settings ADD COLUMN privacy_accepted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'marketing_consent') THEN
    ALTER TABLE user_settings ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'last_login_at') THEN
    ALTER TABLE user_settings ADD COLUMN last_login_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Add suspension columns if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'suspended_at') THEN
    ALTER TABLE user_settings ADD COLUMN suspended_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'suspended_by') THEN
    ALTER TABLE user_settings ADD COLUMN suspended_by UUID DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'suspended_reason') THEN
    ALTER TABLE user_settings ADD COLUMN suspended_reason TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'disabled_at') THEN
    ALTER TABLE user_settings ADD COLUMN disabled_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'disabled_by') THEN
    ALTER TABLE user_settings ADD COLUMN disabled_by UUID DEFAULT NULL;
  END IF;
END $$;

-- Add 2FA columns if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'totp_secret') THEN
    ALTER TABLE user_settings ADD COLUMN totp_secret TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'totp_enabled') THEN
    ALTER TABLE user_settings ADD COLUMN totp_enabled BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'totp_verified_at') THEN
    ALTER TABLE user_settings ADD COLUMN totp_verified_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'backup_codes') THEN
    ALTER TABLE user_settings ADD COLUMN backup_codes TEXT[] DEFAULT NULL;
  END IF;
END $$;

-- Drop and recreate constraints to ensure they're correct
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_tier_check;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_role_check;

ALTER TABLE user_settings
ADD CONSTRAINT user_settings_tier_check
CHECK (tier IN ('free', 'standard', 'premium'));

ALTER TABLE user_settings
ADD CONSTRAINT user_settings_role_check
CHECK (role IN ('user', 'moderator', 'super_admin'));

-- Update the trigger function for new user creation
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
    marketing_consent
  )
  VALUES (
    NEW.id,
    'user',
    'free',
    'anthropic',
    'dark',
    FALSE,
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create changelog table if it doesn't exist
CREATE TABLE IF NOT EXISTS changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  is_major BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Changelog policies (public read)
DROP POLICY IF EXISTS "Anyone can view published changelog" ON changelog;
CREATE POLICY "Anyone can view published changelog" ON changelog
  FOR SELECT USING (published_at <= NOW());

DROP POLICY IF EXISTS "Admins can manage changelog" ON changelog;
CREATE POLICY "Admins can manage changelog" ON changelog
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

-- Admin activity log policies
DROP POLICY IF EXISTS "Admins can view activity log" ON admin_activity_log;
CREATE POLICY "Admins can view activity log" ON admin_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Admins can insert activity log" ON admin_activity_log;
CREATE POLICY "Admins can insert activity log" ON admin_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );
