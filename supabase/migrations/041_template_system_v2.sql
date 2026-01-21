-- ============================================
-- Migration 041: Template System V2
--
-- Key Changes:
-- 1. Remove 'template' from content_mode (content stays in active/inactive)
-- 2. Add is_published flag to track if content has snapshots
-- 3. Add username to user_settings (required for attribution)
-- 4. Add is_public to template_snapshots (private vs public templates)
-- 5. Migrate existing template content back to active
-- ============================================

-- ============================================
-- PART 1: Add username to user_settings
-- ============================================

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS username_set_at TIMESTAMPTZ;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_username ON user_settings(username);

-- ============================================
-- PART 2: Add is_public to template_snapshots
-- ============================================

ALTER TABLE template_snapshots ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Create index for public template discovery (future feature)
CREATE INDEX IF NOT EXISTS idx_template_snapshots_public ON template_snapshots(is_public, content_type) WHERE is_public = TRUE;

-- ============================================
-- PART 3: Add is_published to content tables
-- ============================================

-- Campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Vault Characters
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Oneshots
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- ============================================
-- PART 4: Migrate existing template content
-- Before changing constraints, move template content back to active
-- and mark them as published
-- ============================================

-- Campaigns: template -> active with is_published=true
UPDATE campaigns
SET content_mode = 'active', is_published = TRUE
WHERE content_mode = 'template';

-- Vault Characters: template -> active with is_published=true
UPDATE vault_characters
SET content_mode = 'active', is_published = TRUE
WHERE content_mode = 'template';

-- Oneshots: template -> active with is_published=true
UPDATE oneshots
SET content_mode = 'active', is_published = TRUE
WHERE content_mode = 'template';

-- ============================================
-- PART 5: Update content_mode constraints
-- Remove 'template' option - content is either active or inactive
-- Templates are now stored in template_snapshots table only
-- ============================================

-- Drop existing constraints and recreate without 'template'
-- Campaigns
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_content_mode_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_content_mode_check
  CHECK (content_mode IN ('active', 'inactive'));

-- Vault Characters
ALTER TABLE vault_characters DROP CONSTRAINT IF EXISTS vault_characters_content_mode_check;
ALTER TABLE vault_characters ADD CONSTRAINT vault_characters_content_mode_check
  CHECK (content_mode IN ('active', 'inactive'));

-- Oneshots
ALTER TABLE oneshots DROP CONSTRAINT IF EXISTS oneshots_content_mode_check;
ALTER TABLE oneshots ADD CONSTRAINT oneshots_content_mode_check
  CHECK (content_mode IN ('active', 'inactive'));

-- ============================================
-- PART 6: Update template_snapshots for public discovery
-- Add view and save counts for public templates
-- ============================================

ALTER TABLE template_snapshots ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
-- save_count already exists from migration 040

-- ============================================
-- PART 7: Create run_sessions table for player view links
-- Stores active run sessions that can be shared with players
-- ============================================

CREATE TABLE IF NOT EXISTS run_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oneshot_id UUID NOT NULL REFERENCES oneshots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Share code for player view
  share_code TEXT UNIQUE NOT NULL,

  -- Session state (JSON blob for initiative, timer, etc)
  session_state JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_sessions_oneshot ON run_sessions(oneshot_id);
CREATE INDEX IF NOT EXISTS idx_run_sessions_user ON run_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_run_sessions_share_code ON run_sessions(share_code);
CREATE INDEX IF NOT EXISTS idx_run_sessions_active ON run_sessions(is_active) WHERE is_active = TRUE;

-- RLS for run_sessions
ALTER TABLE run_sessions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own run sessions
CREATE POLICY "Users can manage own run sessions" ON run_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can view active sessions by share code (for player view)
CREATE POLICY "Anyone can view active sessions by share code" ON run_sessions
  FOR SELECT USING (is_active = TRUE);

-- ============================================
-- PART 8: Add encounter_presets to oneshots
-- Pre-defined combatant groups for quick initiative setup
-- ============================================

ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS encounter_presets JSONB DEFAULT '[]';

-- ============================================
-- PART 9: Update template_snapshots RLS for public templates
-- ============================================

-- Drop existing select policy if it exists
DROP POLICY IF EXISTS "Anyone can view public templates" ON template_snapshots;

-- Anyone can view public template snapshots
CREATE POLICY "Anyone can view public templates" ON template_snapshots
  FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);

-- ============================================
-- PART 10: Function to generate unique share codes
-- ============================================

CREATE OR REPLACE FUNCTION generate_share_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
