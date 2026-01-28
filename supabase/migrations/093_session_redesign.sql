-- =====================================================
-- SESSION NOTES SYSTEM REDESIGN
-- Simplify 3-phase to 2-phase (Prep -> Completed)
-- Remove timer, add session states for player access
-- =====================================================

-- =====================================================
-- 1. MIGRATE 'live' PHASE TO 'completed'
-- =====================================================

-- Sessions in 'live' phase are likely sessions that were being played
-- Convert them to 'completed' as the live phase is being removed
UPDATE sessions SET phase = 'completed' WHERE phase = 'live';

-- Update the phase constraint to only allow 2 values
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_phase_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_phase_check
  CHECK (phase IN ('prep', 'completed'));

-- =====================================================
-- 2. ADD NEW SESSION COLUMNS
-- =====================================================

-- prep_notes: Rich text field for the main Prep phase text area
-- This is the primary workspace in Prep mode
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS prep_notes TEXT DEFAULT '';
COMMENT ON COLUMN sessions.prep_notes IS 'Rich text prep notes - main workspace for Prep phase planning';

-- state: Controls player access to the session
-- private = DM only (default for new/prep sessions)
-- open = Players can add notes, view allowed content
-- locked = Read-only for everyone (finalized)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'private';
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_state_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_state_check
  CHECK (state IN ('private', 'open', 'locked'));
COMMENT ON COLUMN sessions.state IS 'Session access state: private (DM only), open (players can add notes), locked (read-only)';

-- share_notes_with_players: Per-session override for visibility
-- null = use campaign default
-- true = share with players
-- false = hide from players
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS share_notes_with_players BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN sessions.share_notes_with_players IS 'Per-session override for whether players can view DM session notes (null = use campaign default)';

-- enabled_prep_modules: Track which optional modules are shown in Prep phase
-- Format: ['checklist', 'references']
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS enabled_prep_modules TEXT[] DEFAULT '{}';
COMMENT ON COLUMN sessions.enabled_prep_modules IS 'Array of enabled optional prep modules: checklist, references';

-- =====================================================
-- 3. ADD CAMPAIGN SESSION SETTINGS
-- =====================================================

-- session_settings: JSONB for campaign-level session defaults
-- Format: { players_can_view_session_notes: boolean, players_can_add_session_notes: boolean }
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS session_settings JSONB DEFAULT '{"players_can_view_session_notes": false, "players_can_add_session_notes": true}';
COMMENT ON COLUMN campaigns.session_settings IS 'Campaign-level session visibility settings: { players_can_view_session_notes, players_can_add_session_notes }';

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions(state);
CREATE INDEX IF NOT EXISTS idx_sessions_campaign_state ON sessions(campaign_id, state);

-- =====================================================
-- 5. UPDATE EXISTING SESSIONS
-- =====================================================

-- Set default state for existing completed sessions to 'private'
-- DMs can then explicitly open them for players
UPDATE sessions
SET state = 'private'
WHERE state IS NULL;

-- Migrate enabled_sections to enabled_prep_modules format
-- Old format: ['prep_checklist', 'thoughts_for_next', 'quick_reference', 'session_timer']
-- New format: ['checklist', 'references']
-- Note: thoughts_for_next and session_timer are no longer optional modules
UPDATE sessions
SET enabled_prep_modules = ARRAY(
  SELECT CASE
    WHEN val = 'prep_checklist' THEN 'checklist'
    WHEN val = 'quick_reference' THEN 'references'
    ELSE NULL
  END
  FROM jsonb_array_elements_text(enabled_sections) AS val
  WHERE val IN ('prep_checklist', 'quick_reference')
)
WHERE enabled_sections IS NOT NULL AND enabled_sections != '[]'::jsonb;

-- =====================================================
-- 6. UPDATE COMMENTS
-- =====================================================

COMMENT ON COLUMN sessions.phase IS 'Session workflow phase: prep (planning), completed (finished)';
COMMENT ON COLUMN sessions.session_timer IS 'DEPRECATED: Timer state (feature removed). Preserved for data retention.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
