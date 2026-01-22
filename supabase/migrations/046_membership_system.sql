-- ============================================
-- Migration 046: Membership System
--
-- Implements tiered membership with:
-- - Adventurer (free), Hero, Legend tiers
-- - Founder status for early adopters
-- - AI access decoupled from tiers
-- - App-wide settings for billing toggle
-- ============================================

-- ============================================
-- PART 1: Add membership columns to user_settings
-- ============================================

-- First, drop existing tier check constraint if it exists (might have old values)
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_tier_check;

-- Update existing tier values to new naming convention
UPDATE user_settings SET tier = 'adventurer' WHERE tier IN ('free', 'adventurer');
UPDATE user_settings SET tier = 'hero' WHERE tier = 'standard';
UPDATE user_settings SET tier = 'legend' WHERE tier = 'premium';

-- Add tier column if it doesn't exist, then add the new check constraint
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'adventurer';

-- Add the new check constraint
ALTER TABLE user_settings ADD CONSTRAINT user_settings_tier_check
  CHECK (tier IN ('adventurer', 'hero', 'legend'));

-- Founder status (permanent reward for early users)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT false;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS founder_granted_at TIMESTAMPTZ;

-- AI access - decoupled from tier, manually granted
-- Drop the old ai_enabled column if it exists and recreate as ai_access
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_access BOOLEAN DEFAULT false;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_access_granted_by TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_access_granted_at TIMESTAMPTZ;

-- Future billing integration
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS subscription_tier TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Drop existing constraint if it exists, then add
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_subscription_status_check;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_subscription_status_check
  CHECK (subscription_status IN ('none', 'active', 'cancelled', 'past_due'));

-- ============================================
-- PART 2: Create app_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  billing_enabled BOOLEAN DEFAULT false,
  founder_signups_enabled BOOLEAN DEFAULT true,
  founder_signups_closed_at TIMESTAMPTZ,
  maintenance_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO app_settings (id, billing_enabled, founder_signups_enabled)
VALUES ('global', false, true)
ON CONFLICT (id) DO NOTHING;

-- RLS for app_settings (only admins can write, anyone can read)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
CREATE POLICY "Anyone can read app settings" ON app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can update app settings" ON app_settings;
CREATE POLICY "Only admins can update app settings" ON app_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Only admins can insert app settings" ON app_settings;
CREATE POLICY "Only admins can insert app settings" ON app_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- PART 3: Migrate existing users to Founder status
-- ============================================

-- All existing users become Founders
UPDATE user_settings
SET
  is_founder = true,
  founder_granted_at = COALESCE(created_at, NOW()),
  tier = 'adventurer'
WHERE is_founder IS NULL OR is_founder = false;

-- Migrate ai_enabled to ai_access if ai_enabled column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_enabled'
  ) THEN
    UPDATE user_settings
    SET ai_access = ai_enabled
    WHERE ai_enabled = true AND (ai_access IS NULL OR ai_access = false);
  END IF;
END $$;

-- ============================================
-- PART 4: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_settings_tier ON user_settings(tier);
CREATE INDEX IF NOT EXISTS idx_user_settings_founder ON user_settings(is_founder) WHERE is_founder = true;
CREATE INDEX IF NOT EXISTS idx_user_settings_ai_access ON user_settings(ai_access) WHERE ai_access = true;

-- ============================================
-- PART 5: Function to get user limits
-- ============================================

CREATE OR REPLACE FUNCTION get_user_effective_limits(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_tier TEXT;
  v_is_founder BOOLEAN;
  v_limits JSON;
BEGIN
  SELECT tier, is_founder INTO v_tier, v_is_founder
  FROM user_settings
  WHERE user_id = p_user_id;

  -- Founders on Adventurer get Hero limits
  IF v_is_founder AND v_tier = 'adventurer' THEN
    v_limits := '{
      "campaigns": 10,
      "oneshots": 10,
      "vaultCharacters": 50,
      "storageMB": 500,
      "shareLinks": 10,
      "publicTemplates": 5,
      "pdfExport": true,
      "customThemes": false
    }'::JSON;
  ELSIF v_tier = 'adventurer' THEN
    v_limits := '{
      "campaigns": 3,
      "oneshots": 3,
      "vaultCharacters": 10,
      "storageMB": 100,
      "shareLinks": 3,
      "publicTemplates": 1,
      "pdfExport": false,
      "customThemes": false
    }'::JSON;
  ELSIF v_tier = 'hero' THEN
    v_limits := '{
      "campaigns": 10,
      "oneshots": 10,
      "vaultCharacters": 50,
      "storageMB": 500,
      "shareLinks": 10,
      "publicTemplates": 5,
      "pdfExport": true,
      "customThemes": false
    }'::JSON;
  ELSIF v_tier = 'legend' THEN
    v_limits := '{
      "campaigns": -1,
      "oneshots": -1,
      "vaultCharacters": -1,
      "storageMB": 2048,
      "shareLinks": -1,
      "publicTemplates": -1,
      "pdfExport": true,
      "customThemes": true
    }'::JSON;
  ELSE
    -- Default to adventurer
    v_limits := '{
      "campaigns": 3,
      "oneshots": 3,
      "vaultCharacters": 10,
      "storageMB": 100,
      "shareLinks": 3,
      "publicTemplates": 1,
      "pdfExport": false,
      "customThemes": false
    }'::JSON;
  END IF;

  RETURN v_limits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: Function to get user usage stats
-- ============================================

CREATE OR REPLACE FUNCTION get_user_usage(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_campaigns INTEGER;
  v_oneshots INTEGER;
  v_vault_characters INTEGER;
  v_share_links INTEGER;
  v_public_templates INTEGER;
  v_storage_bytes BIGINT;
BEGIN
  -- Count campaigns (including deleted - they count toward limit)
  SELECT COUNT(*) INTO v_campaigns
  FROM campaigns
  WHERE user_id = p_user_id;

  -- Count oneshots
  SELECT COUNT(*) INTO v_oneshots
  FROM oneshots
  WHERE user_id = p_user_id;

  -- Count vault characters only (not campaign NPCs)
  SELECT COUNT(*) INTO v_vault_characters
  FROM vault_characters
  WHERE user_id = p_user_id;

  -- Count active share links across all content types
  SELECT COUNT(*) INTO v_share_links
  FROM (
    SELECT id FROM campaign_shares cs
    JOIN campaigns c ON c.id = cs.campaign_id
    WHERE c.user_id = p_user_id AND cs.is_active = true
    UNION ALL
    SELECT id FROM character_shares chs
    JOIN vault_characters vc ON vc.id = chs.character_id
    WHERE vc.user_id = p_user_id AND chs.is_active = true
    UNION ALL
    SELECT id FROM oneshot_shares os
    JOIN oneshots o ON o.id = os.oneshot_id
    WHERE o.user_id = p_user_id AND os.is_active = true
  ) shares;

  -- Count public templates
  SELECT COUNT(*) INTO v_public_templates
  FROM template_snapshots
  WHERE user_id = p_user_id AND is_public = true;

  -- Storage calculation would need to be done via storage API
  -- For now, return 0 and calculate client-side or via separate API
  v_storage_bytes := 0;

  RETURN json_build_object(
    'campaigns', v_campaigns,
    'oneshots', v_oneshots,
    'vaultCharacters', v_vault_characters,
    'shareLinks', v_share_links,
    'publicTemplates', v_public_templates,
    'storageBytes', v_storage_bytes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================

COMMENT ON COLUMN user_settings.tier IS 'Membership tier: adventurer (free), hero, legend';
COMMENT ON COLUMN user_settings.is_founder IS 'Early adopter status - grants Hero limits on free tier permanently';
COMMENT ON COLUMN user_settings.ai_access IS 'AI features access - manually granted, not tied to tier';
COMMENT ON TABLE app_settings IS 'Global application settings including billing toggle';
