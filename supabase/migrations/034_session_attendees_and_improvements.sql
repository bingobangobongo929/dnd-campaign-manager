-- Migration 034: Session Attendees for Vault + Campaign Session Improvements
-- Adds party member tracking to vault sessions and improves campaign sessions

-- ============================================================================
-- PART 1: Vault Session Attendees (play_journal_attendees)
-- ============================================================================

-- Junction table linking play_journal entries to party members who attended
CREATE TABLE IF NOT EXISTS play_journal_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_journal_id UUID NOT NULL REFERENCES play_journal(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES vault_character_relationships(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(play_journal_id, relationship_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_play_journal_attendees_journal
  ON play_journal_attendees(play_journal_id);
CREATE INDEX IF NOT EXISTS idx_play_journal_attendees_relationship
  ON play_journal_attendees(relationship_id);

-- RLS policies
ALTER TABLE play_journal_attendees ENABLE ROW LEVEL SECURITY;

-- Users can only access attendees for their own play journal entries
CREATE POLICY "Users can view their own session attendees"
  ON play_journal_attendees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM play_journal pj
      JOIN vault_characters vc ON pj.character_id = vc.id
      WHERE pj.id = play_journal_attendees.play_journal_id
      AND vc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attendees to their own sessions"
  ON play_journal_attendees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM play_journal pj
      JOIN vault_characters vc ON pj.character_id = vc.id
      WHERE pj.id = play_journal_attendees.play_journal_id
      AND vc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attendees from their own sessions"
  ON play_journal_attendees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM play_journal pj
      JOIN vault_characters vc ON pj.character_id = vc.id
      WHERE pj.id = play_journal_attendees.play_journal_id
      AND vc.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 2: 2FA Security Improvements
-- ============================================================================

-- Add totp_verified_at to track when 2FA was last successfully verified
-- This is used to enforce 2FA verification per login session
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN user_settings.totp_verified_at IS 'Timestamp of last successful 2FA verification - used to validate session';

-- ============================================================================
-- PART 3: Onboarding tracking in user_settings
-- ============================================================================

-- Add onboarding completion tracking
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS show_tips BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tips_dismissed JSONB DEFAULT '[]'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN user_settings.onboarding_completed IS 'Whether user has completed the initial onboarding tour';
COMMENT ON COLUMN user_settings.show_tips IS 'Whether to show contextual help tips throughout the app';
COMMENT ON COLUMN user_settings.tips_dismissed IS 'Array of tip IDs that the user has dismissed';

-- ============================================================================
-- PART 4: Demo content support
-- ============================================================================

-- Add is_demo flag to content tables for demo content identification
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

ALTER TABLE oneshots
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Indexes for demo content queries
CREATE INDEX IF NOT EXISTS idx_campaigns_is_demo ON campaigns(is_demo) WHERE is_demo = TRUE;
CREATE INDEX IF NOT EXISTS idx_vault_characters_is_demo ON vault_characters(is_demo) WHERE is_demo = TRUE;
CREATE INDEX IF NOT EXISTS idx_oneshots_is_demo ON oneshots(is_demo) WHERE is_demo = TRUE;

-- RLS policy for public demo content viewing
CREATE POLICY "Anyone can view demo campaigns"
  ON campaigns
  FOR SELECT
  USING (is_demo = TRUE OR user_id = auth.uid());

CREATE POLICY "Anyone can view demo characters"
  ON vault_characters
  FOR SELECT
  USING (is_demo = TRUE OR user_id = auth.uid());

CREATE POLICY "Anyone can view demo oneshots"
  ON oneshots
  FOR SELECT
  USING (is_demo = TRUE OR user_id = auth.uid());

-- ============================================================================
-- PART 5: Version field for play_journal if not exists
-- ============================================================================

-- Ensure play_journal has version field for optimistic locking
ALTER TABLE play_journal
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- ============================================================================
-- PART 6: Helper function to get session with attendees
-- ============================================================================

CREATE OR REPLACE FUNCTION get_play_journal_with_attendees(p_journal_id UUID)
RETURNS TABLE (
  journal_data JSONB,
  attendees JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_jsonb(pj.*) as journal_data,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', vcr.id,
          'name', vcr.related_name,
          'image_url', vcr.related_image_url,
          'relationship_type', vcr.relationship_type
        )
      ) FILTER (WHERE vcr.id IS NOT NULL),
      '[]'::jsonb
    ) as attendees
  FROM play_journal pj
  LEFT JOIN play_journal_attendees pja ON pj.id = pja.play_journal_id
  LEFT JOIN vault_character_relationships vcr ON pja.relationship_id = vcr.id
  WHERE pj.id = p_journal_id
  GROUP BY pj.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
