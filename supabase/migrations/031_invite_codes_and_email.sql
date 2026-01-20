-- Invite codes system for controlled signups
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id) DEFAULT NULL,
  used_at TIMESTAMPTZ DEFAULT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  note TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);

-- Email verification tokens (for custom email verification flow)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- Add email_verified column to user_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'email_verified') THEN
    ALTER TABLE user_settings ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'email_verified_at') THEN
    ALTER TABLE user_settings ADD COLUMN email_verified_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'invited_by') THEN
    ALTER TABLE user_settings ADD COLUMN invited_by UUID REFERENCES auth.users(id) DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'invite_code_used') THEN
    ALTER TABLE user_settings ADD COLUMN invite_code_used TEXT DEFAULT NULL;
  END IF;
END $$;

-- Enable RLS on invite_codes
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Invite codes policies
-- Users can view invite codes they created
CREATE POLICY "Users can view own invite codes" ON invite_codes
  FOR SELECT USING (auth.uid() = created_by);

-- Admins can view all invite codes
CREATE POLICY "Admins can view all invite codes" ON invite_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

-- Admins can create invite codes
CREATE POLICY "Admins can create invite codes" ON invite_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

-- Admins can update invite codes
CREATE POLICY "Admins can update invite codes" ON invite_codes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

-- Admins can delete invite codes
CREATE POLICY "Admins can delete invite codes" ON invite_codes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

-- Email verification tokens - service role only (no public access)
CREATE POLICY "Service role only for email verification" ON email_verification_tokens
  FOR ALL USING (false);

-- Password reset tokens - service role only (no public access)
CREATE POLICY "Service role only for password reset" ON password_reset_tokens
  FOR ALL USING (false);

-- Function to validate and use an invite code
CREATE OR REPLACE FUNCTION validate_invite_code(code_to_validate TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  invite_code_id UUID,
  creator_id UUID,
  error_message TEXT
) AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Find the invite code
  SELECT * INTO invite_record
  FROM invite_codes
  WHERE code = code_to_validate;

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Invalid invite code'::TEXT;
    RETURN;
  END IF;

  -- Check if code is active
  IF NOT invite_record.is_active THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'This invite code is no longer active'::TEXT;
    RETURN;
  END IF;

  -- Check if code is expired
  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'This invite code has expired'::TEXT;
    RETURN;
  END IF;

  -- Check if code has reached max uses
  IF invite_record.max_uses IS NOT NULL AND invite_record.current_uses >= invite_record.max_uses THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'This invite code has reached its maximum uses'::TEXT;
    RETURN;
  END IF;

  -- Code is valid
  RETURN QUERY SELECT true, invite_record.id, invite_record.created_by, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use an invite code (increment usage)
CREATE OR REPLACE FUNCTION use_invite_code(code_to_use TEXT, user_id_using UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Validate first
  SELECT * INTO invite_record
  FROM invite_codes
  WHERE code = code_to_use
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Update the invite code
  UPDATE invite_codes
  SET
    current_uses = current_uses + 1,
    used_by = user_id_using,
    used_at = NOW(),
    updated_at = NOW()
  WHERE id = invite_record.id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the create_default_user_settings function to include new columns
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
    email_verified
  )
  VALUES (
    NEW.id,
    'user',
    'free',
    'anthropic',
    'dark',
    FALSE,
    FALSE,
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
