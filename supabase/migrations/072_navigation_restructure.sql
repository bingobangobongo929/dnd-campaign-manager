-- Navigation Restructure & Character Migration
-- Adds support for:
-- 1. Campaign characters: backstory, motivations, play_status
-- 2. Adventures (campaigns with duration_type)
-- 3. Character snapshots enhancements (Session 0)
-- 4. Help tips preferences

-- =============================================================================
-- CHARACTERS TABLE UPDATES
-- =============================================================================

-- Add backstory field (rich text for player's character history)
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS backstory TEXT;

-- Add motivations field (what drives the character)
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS motivations TEXT;

-- Add play_status for in-play character tracking
-- Values: 'active', 'inactive', 'hostage', 'missing', 'deceased', 'retired'
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS play_status TEXT DEFAULT 'active';

-- Add is_party_member flag for quick filtering
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS is_party_member BOOLEAN DEFAULT false;

-- =============================================================================
-- CAMPAIGNS TABLE UPDATES
-- =============================================================================

-- Add duration_type for distinguishing campaigns, adventures, and oneshots
-- Values: 'campaign' (ongoing), 'adventure' (3-9 sessions), 'oneshot' (1 session, but in campaigns table for special cases)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS duration_type TEXT DEFAULT 'campaign';

-- Add estimated_sessions for adventures
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS estimated_sessions INTEGER;

-- Add inactive_reason for content_mode = 'inactive'
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS inactive_reason TEXT;

-- =============================================================================
-- CHARACTER SNAPSHOTS TABLE UPDATES
-- =============================================================================
-- Note: character_snapshots was created in migration 059
-- We just need to add the missing columns

-- Add campaign_character_id if not exists (may have been added with different constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'character_snapshots' AND column_name = 'campaign_character_id'
  ) THEN
    ALTER TABLE character_snapshots ADD COLUMN campaign_character_id UUID REFERENCES characters(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add snapshot_name for custom naming
ALTER TABLE character_snapshots
ADD COLUMN IF NOT EXISTS snapshot_name TEXT;

-- Add created_by for ownership tracking
ALTER TABLE character_snapshots
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add index for created_by
CREATE INDEX IF NOT EXISTS idx_character_snapshots_created_by ON character_snapshots(created_by);
CREATE INDEX IF NOT EXISTS idx_character_snapshots_campaign_id ON character_snapshots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_character_snapshots_type ON character_snapshots(snapshot_type);

-- Enable RLS if not already enabled
ALTER TABLE character_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate with correct logic)
DROP POLICY IF EXISTS "Users can view their own character snapshots" ON character_snapshots;
DROP POLICY IF EXISTS "Users can create their own character snapshots" ON character_snapshots;
DROP POLICY IF EXISTS "Users can delete their own character snapshots" ON character_snapshots;

-- Users can view snapshots for characters they own or campaigns they're in
CREATE POLICY "Users can view their own character snapshots" ON character_snapshots
  FOR SELECT USING (
    created_by = auth.uid()
    OR vault_character_id IN (SELECT id FROM vault_characters WHERE user_id = auth.uid())
    OR campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
    OR campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
  );

-- Users can create snapshots for their own characters
CREATE POLICY "Users can create their own character snapshots" ON character_snapshots
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      vault_character_id IN (SELECT id FROM vault_characters WHERE user_id = auth.uid())
      OR campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
    )
  );

-- Users can delete their own snapshots
CREATE POLICY "Users can delete their own character snapshots" ON character_snapshots
  FOR DELETE USING (
    created_by = auth.uid()
    OR vault_character_id IN (SELECT id FROM vault_characters WHERE user_id = auth.uid())
    OR campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
  );

-- =============================================================================
-- VAULT CHARACTERS UPDATES
-- =============================================================================

-- Add private campaign notes (player's personal notes per campaign, always editable)
ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS private_campaign_notes JSONB DEFAULT '{}';
-- Structure: { [campaign_id]: "notes text" }

-- Add campaign_links for tracking which campaigns this character is in
ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS campaign_links JSONB DEFAULT '[]';
-- Structure: [{ campaign_id, character_id, joined_at, snapshot_id, status }]

-- =============================================================================
-- USER SETTINGS UPDATES (Help tips already exist, just document)
-- =============================================================================

-- Note: user_settings already has:
-- - show_tips: boolean
-- - tips_dismissed: Json
-- - onboarding_completed: boolean
-- These are sufficient for the help tips system

-- =============================================================================
-- ONESHOTS TABLE UPDATES (for consistency)
-- =============================================================================

-- Add fields that oneshots need to match the new structure
ALTER TABLE oneshots
ADD COLUMN IF NOT EXISTS duration_type TEXT DEFAULT 'oneshot';

ALTER TABLE oneshots
ADD COLUMN IF NOT EXISTS estimated_sessions INTEGER DEFAULT 1;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_characters_play_status ON characters(play_status);
CREATE INDEX IF NOT EXISTS idx_characters_party_member ON characters(is_party_member);
CREATE INDEX IF NOT EXISTS idx_campaigns_duration_type ON campaigns(duration_type);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN characters.backstory IS 'Rich text backstory for the character (for campaign characters)';
COMMENT ON COLUMN characters.motivations IS 'What drives this character - their goals and motivations';
COMMENT ON COLUMN characters.play_status IS 'Current status in the campaign: active, inactive, hostage, missing, deceased, retired';
COMMENT ON COLUMN characters.is_party_member IS 'Quick flag to identify party member PCs';
COMMENT ON COLUMN campaigns.duration_type IS 'Type of content: campaign (ongoing), adventure (3-9 sessions)';
COMMENT ON COLUMN campaigns.estimated_sessions IS 'Estimated number of sessions for adventures';
COMMENT ON COLUMN campaigns.inactive_reason IS 'Reason for setting content to inactive mode';
COMMENT ON TABLE character_snapshots IS 'Snapshots of character state at specific points (Session 0, etc.)';
COMMENT ON COLUMN vault_characters.private_campaign_notes IS 'Player private notes per campaign, always editable';
COMMENT ON COLUMN vault_characters.campaign_links IS 'Array of campaign links with metadata';
