-- =====================================================
-- SESSION PREP MODULES EXPANSION
-- Add fields for the 7 prep modules:
-- 1. Session Goals (Green) - objectives, scenes, emotional beats
-- 2. Key NPCs (Purple) - NPCs likely to appear with quick reference
-- 3. Random Tables (Orange) - links to campaign random tables
-- 4. Music & Ambiance (Pink) - playlists, ambient sounds, mood
-- 5. Session Opener (Amber) - opening narration, recap points
-- 6. Checklist (Yellow) - prep tasks (existing: prep_checklist)
-- 7. Quick References (Cyan) - key NPCs/locations/quests (existing: pinned_references)
-- =====================================================

-- =====================================================
-- 1. ADD NEW PREP MODULE FIELDS
-- =====================================================

-- Session Goals: Key objectives, scenes you want to hit, emotional beats
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_goals TEXT DEFAULT '';
COMMENT ON COLUMN sessions.session_goals IS 'Prep module: Session goals, key objectives, scenes to hit, emotional beats';

-- Key NPCs: NPCs likely to appear with quick stats/motives reference
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS key_npcs TEXT DEFAULT '';
COMMENT ON COLUMN sessions.key_npcs IS 'Prep module: Key NPCs for this session with quick reference notes';

-- Music & Ambiance: Spotify playlists, ambient sounds, mood notes
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS music_ambiance TEXT DEFAULT '';
COMMENT ON COLUMN sessions.music_ambiance IS 'Prep module: Music playlists, ambient sounds, mood/atmosphere notes';

-- Session Opener: Opening narration, recap points for players
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_opener TEXT DEFAULT '';
COMMENT ON COLUMN sessions.session_opener IS 'Prep module: Opening narration and recap points for session start';

-- Random Table Links: JSON array of linked random table IDs
-- Format: [{ tableId: string, note: string }]
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS random_table_links JSONB DEFAULT '[]';
COMMENT ON COLUMN sessions.random_table_links IS 'Prep module: Array of linked random table references [{tableId, note}]';

-- =====================================================
-- 2. UPDATE ENABLED_PREP_MODULES COMMENT
-- =====================================================

-- Update the comment to document all available modules
COMMENT ON COLUMN sessions.enabled_prep_modules IS 'Array of enabled prep modules: session_goals, key_npcs, random_tables, music_ambiance, session_opener, checklist, references';

-- =====================================================
-- 3. PRESERVE EXISTING DATA
-- =====================================================

-- The existing fields are preserved:
-- - prep_checklist (JSONB) - used by checklist module
-- - pinned_references (JSONB) - used by references module
-- - prep_notes (TEXT) - main prep workspace

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
