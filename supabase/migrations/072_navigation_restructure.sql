-- Navigation Restructure & Character Migration
-- Adds support for:
-- 1. Campaign characters: backstory, motivations, play_status
-- 2. Adventures (campaigns with duration_type)
-- 3. Character snapshots (Session 0)
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

-- =============================================================================
-- CHARACTER SNAPSHOTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS character_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Can reference either vault or campaign character
  vault_character_id UUID REFERENCES vault_characters(id) ON DELETE CASCADE,
  campaign_character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  -- Snapshot data
  snapshot_data JSONB NOT NULL,
  snapshot_type TEXT DEFAULT 'session_0', -- 'session_0', 'current_state', 'manual', 'join'
  snapshot_name TEXT, -- Optional custom name
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_character_snapshots_vault ON character_snapshots(vault_character_id);
CREATE INDEX IF NOT EXISTS idx_character_snapshots_campaign ON character_snapshots(campaign_character_id);
CREATE INDEX IF NOT EXISTS idx_character_snapshots_campaign_id ON character_snapshots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_character_snapshots_type ON character_snapshots(snapshot_type);

-- RLS for character_snapshots
ALTER TABLE character_snapshots ENABLE ROW LEVEL SECURITY;

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
    created_by = auth.uid()
    OR vault_character_id IN (SELECT id FROM vault_characters WHERE user_id = auth.uid())
    OR campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
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
COMMENT ON TABLE character_snapshots IS 'Snapshots of character state at specific points (Session 0, etc.)';
COMMENT ON COLUMN vault_characters.private_campaign_notes IS 'Player private notes per campaign, always editable';
COMMENT ON COLUMN vault_characters.campaign_links IS 'Array of campaign links with metadata';
