-- Migration: Security Improvements
-- 1. Prevent users from setting is_demo=true on their own content
-- 2. Fix SECURITY DEFINER function to include auth check
-- 3. Add index for audit logging

-- ═══════════════════════════════════════════════════════════════════
-- DEMO FLAG PROTECTION
-- Prevent regular users from marking their content as demo
-- ═══════════════════════════════════════════════════════════════════

-- Add constraint: is_demo can only be true if user_id is NULL (system-created demo content)
-- This prevents users from setting is_demo=true on their own content to make it public

-- Drop existing constraints if they exist (from migration 035)
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_demo_immutable;
ALTER TABLE vault_characters DROP CONSTRAINT IF EXISTS vault_characters_demo_immutable;
ALTER TABLE oneshots DROP CONSTRAINT IF EXISTS oneshots_demo_immutable;

-- Add new constraints that enforce is_demo=true only when user_id is NULL
ALTER TABLE campaigns ADD CONSTRAINT campaigns_demo_immutable
  CHECK (is_demo = false OR user_id IS NULL);

ALTER TABLE vault_characters ADD CONSTRAINT vault_characters_demo_immutable
  CHECK (is_demo = false OR user_id IS NULL);

ALTER TABLE oneshots ADD CONSTRAINT oneshots_demo_immutable
  CHECK (is_demo = false OR user_id IS NULL);

-- ═══════════════════════════════════════════════════════════════════
-- FIX SECURITY DEFINER FUNCTION
-- Add authentication check to prevent unauthorized data access
-- ═══════════════════════════════════════════════════════════════════

-- Drop the old function first
DROP FUNCTION IF EXISTS get_play_journal_with_attendees(UUID);

-- Recreate with proper authorization check
CREATE OR REPLACE FUNCTION get_play_journal_with_attendees(p_journal_id UUID)
RETURNS TABLE (
  journal_id UUID,
  journal_title TEXT,
  journal_notes TEXT,
  session_date DATE,
  character_id UUID,
  attendee_id UUID,
  attendee_name TEXT,
  attendee_image_url TEXT,
  relationship_type TEXT
) AS $$
BEGIN
  -- SECURITY: Verify the requesting user owns the character associated with this journal
  IF NOT EXISTS (
    SELECT 1
    FROM play_journal pj
    JOIN vault_characters vc ON pj.character_id = vc.id
    WHERE pj.id = p_journal_id
    AND vc.user_id = auth.uid()
  ) THEN
    -- Return empty result if user doesn't own this journal
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pj.id as journal_id,
    pj.title as journal_title,
    pj.notes as journal_notes,
    pj.session_date,
    pj.character_id,
    pja.relationship_id as attendee_id,
    vcr.related_name as attendee_name,
    vcr.related_image_url as attendee_image_url,
    vcr.relationship_type
  FROM play_journal pj
  LEFT JOIN play_journal_attendees pja ON pj.id = pja.play_journal_id
  LEFT JOIN vault_character_relationships vcr ON pja.relationship_id = vcr.id
  WHERE pj.id = p_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_play_journal_with_attendees(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- AUDIT LOGGING IMPROVEMENTS
-- Add index for faster audit log queries
-- ═══════════════════════════════════════════════════════════════════

-- Add index on action column for filtering audit logs
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action
  ON admin_activity_log(action);

-- Add index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at
  ON admin_activity_log(created_at DESC);

-- Add composite index for user + action queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_action
  ON admin_activity_log(admin_id, action);

-- ═══════════════════════════════════════════════════════════════════
-- COMMENT ON SECURITY FEATURES
-- ═══════════════════════════════════════════════════════════════════

COMMENT ON CONSTRAINT campaigns_demo_immutable ON campaigns IS
  'Prevents users from setting is_demo=true on their own campaigns. Only system-created content (user_id=NULL) can be marked as demo.';

COMMENT ON CONSTRAINT vault_characters_demo_immutable ON vault_characters IS
  'Prevents users from setting is_demo=true on their own characters. Only system-created content (user_id=NULL) can be marked as demo.';

COMMENT ON CONSTRAINT oneshots_demo_immutable ON oneshots IS
  'Prevents users from setting is_demo=true on their own oneshots. Only system-created content (user_id=NULL) can be marked as demo.';

COMMENT ON FUNCTION get_play_journal_with_attendees(UUID) IS
  'Returns play journal with attendees. Includes auth check to ensure user owns the character associated with the journal.';
