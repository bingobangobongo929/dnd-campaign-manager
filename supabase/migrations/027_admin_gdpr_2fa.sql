-- Migration: Admin System, GDPR Compliance, and 2FA Support
-- This migration adds role-based access control, GDPR compliance fields, and 2FA support

-- ============================================
-- 1. Add new columns to user_settings
-- ============================================

-- Add role column for admin system
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'moderator', 'super_admin'));

-- Add account status columns for suspension/disabling
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS disabled_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Add GDPR compliance columns
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;

-- Add 2FA columns
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS totp_secret TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[] DEFAULT NULL;

-- ============================================
-- 2. Create changelog table
-- ============================================

CREATE TABLE IF NOT EXISTS changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  is_major BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;

-- Public read access for published entries
CREATE POLICY "Anyone can view published changelog" ON changelog
  FOR SELECT USING (published_at <= NOW());

-- Admin write access
CREATE POLICY "Admins can insert changelog" ON changelog
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update changelog" ON changelog
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

CREATE POLICY "Admins can delete changelog" ON changelog
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================
-- 3. Create admin activity log table
-- ============================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity log
CREATE POLICY "Admins can view activity log" ON admin_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

-- Only admins can insert activity log entries
CREATE POLICY "Admins can insert activity log" ON admin_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

-- ============================================
-- 4. Update RLS policies for admin access
-- ============================================

-- Drop existing user_settings SELECT policy if exists
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;

-- Create new policy that allows admins to view all user settings
CREATE POLICY "Users can view own settings or admins can view all" ON user_settings
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid()
      AND us.role IN ('super_admin', 'moderator')
    )
  );

-- Drop existing UPDATE policy if exists
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;

-- Create new policy that allows users to update own settings, or super_admin to update any
CREATE POLICY "Users can update own settings or super_admin can update all" ON user_settings
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_settings us
      WHERE us.user_id = auth.uid()
      AND us.role = 'super_admin'
    )
  );

-- ============================================
-- 5. Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_settings_role ON user_settings(role);
CREATE INDEX IF NOT EXISTS idx_user_settings_suspended ON user_settings(suspended_at) WHERE suspended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_settings_disabled ON user_settings(disabled_at) WHERE disabled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_changelog_published ON changelog(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target ON admin_activity_log(target_user_id);

-- ============================================
-- 6. Create helper function to check admin status
-- ============================================

CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = check_user_id
    AND role IN ('super_admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = check_user_id
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Add trigger to update updated_at on changelog
-- ============================================

CREATE OR REPLACE FUNCTION update_changelog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS changelog_updated_at ON changelog;
CREATE TRIGGER changelog_updated_at
  BEFORE UPDATE ON changelog
  FOR EACH ROW
  EXECUTE FUNCTION update_changelog_updated_at();
