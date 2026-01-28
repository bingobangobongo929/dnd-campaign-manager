-- =====================================================
-- SESSION RANDOM TABLES TEXT FIELD
-- Simple text field for session prep random table notes
-- (Separate from the structured random_tables system)
-- =====================================================

-- Add simple text field for random table quick notes in prep
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS random_tables TEXT DEFAULT '';
COMMENT ON COLUMN sessions.random_tables IS 'Prep module: Quick random table notes (names, encounters, loot lists)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
