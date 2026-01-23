-- =====================================================
-- SESSION WORKFLOW ENHANCEMENT
-- Add modular sections, timer, pinned references,
-- and campaign-level session defaults
-- =====================================================

-- =====================================================
-- 1. UPDATE SESSIONS TABLE
-- =====================================================

-- Update phase values to simpler set (prep, live, completed)
-- Map existing values: planned -> prep, active -> live, recap/complete -> completed
UPDATE sessions SET phase = 'prep' WHERE phase IN ('planned', 'prep');
UPDATE sessions SET phase = 'live' WHERE phase = 'active';
UPDATE sessions SET phase = 'completed' WHERE phase IN ('recap', 'complete');

-- Add CHECK constraint for new phase values (drop old if exists)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_phase_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_phase_check
  CHECK (phase IN ('prep', 'live', 'completed'));

-- Add enabled_sections - tracks which optional sections are shown for this session
-- Format: ['prep_checklist', 'thoughts_for_next', 'quick_reference', 'session_timer']
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS enabled_sections JSONB DEFAULT '["prep_checklist"]';

-- Add session_timer - stores timer state
-- Format: { started_at: ISO string, paused_at: ISO string | null, elapsed_seconds: number, breaks: [{start, end}] }
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_timer JSONB DEFAULT NULL;

-- Add pinned_references - stores quick reference pins
-- Format: [{ entity_type: 'character'|'npc'|'location'|'lore', entity_id: uuid, label: string }]
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pinned_references JSONB DEFAULT '[]';

-- Add attendee tracking fields
-- actual_attendees: characters that actually attended (marked during/after session)
-- Format: [{ character_id: uuid, status: 'attended'|'absent'|'late' }]
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]';

-- Comments for clarity
COMMENT ON COLUMN sessions.phase IS 'Session workflow phase: prep (planning), live (in progress), completed (finished)';
COMMENT ON COLUMN sessions.enabled_sections IS 'Array of enabled optional sections: prep_checklist, thoughts_for_next, quick_reference, session_timer';
COMMENT ON COLUMN sessions.session_timer IS 'Timer state: { started_at, paused_at, elapsed_seconds, breaks }';
COMMENT ON COLUMN sessions.pinned_references IS 'Quick reference pins: [{ entity_type, entity_id, label }]';
COMMENT ON COLUMN sessions.attendees IS 'Session attendees: [{ character_id, status }]';

-- =====================================================
-- 2. UPDATE CAMPAIGNS TABLE
-- =====================================================

-- Add default_session_sections - default sections enabled for new sessions
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS default_session_sections JSONB DEFAULT '["prep_checklist"]';

-- Add default_prep_checklist - template checklist items for new sessions
-- Format: [{ id: uuid, text: string, default_checked: boolean }]
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS default_prep_checklist JSONB DEFAULT '[]';

-- Comments for clarity
COMMENT ON COLUMN campaigns.default_session_sections IS 'Default enabled sections for new sessions';
COMMENT ON COLUMN campaigns.default_prep_checklist IS 'Template checklist items for new session prep: [{ id, text, default_checked }]';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sessions_phase ON sessions(phase);
CREATE INDEX IF NOT EXISTS idx_sessions_campaign_phase ON sessions(campaign_id, phase);

-- =====================================================
-- 4. ADD DEFAULT SECTIONS TO EXISTING CAMPAIGNS
-- =====================================================

-- Set default_session_sections for existing campaigns that don't have it
UPDATE campaigns
SET default_session_sections = '["prep_checklist"]'
WHERE default_session_sections IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
