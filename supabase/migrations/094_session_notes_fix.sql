-- =====================================================
-- SESSION NOTES SYSTEM - PHASE 0 CRITICAL FIXES
-- 1. Add session_enhanced_view toggle to user_settings
-- 2. Migrate summary → notes where notes is empty
-- =====================================================

-- =====================================================
-- 1. ADD SESSION ENHANCED VIEW TOGGLE TO USER SETTINGS
-- =====================================================

-- This stores the user's preference for Standard vs Enhanced view
-- in the database (not localStorage) so it syncs across devices.
-- Default is FALSE (Standard mode).
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS session_enhanced_view BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_settings.session_enhanced_view IS
  'User preference for session notes view mode: false=Standard (single notes field), true=Enhanced (Quick Recap + Session Notes). Only available to moderator/super_admin roles.';

-- =====================================================
-- 2. MIGRATE SUMMARY TO NOTES WHERE NOTES IS EMPTY
-- =====================================================

-- For existing sessions where users wrote in the summary field but notes is empty,
-- copy the summary content to notes. This ensures Standard mode users (who only
-- see the notes field) don't lose their existing content.
--
-- We do NOT clear the summary field because:
-- - Enhanced mode users need it for the Quick Recap feature
-- - It preserves data integrity
UPDATE sessions
SET notes = summary
WHERE
  summary IS NOT NULL
  AND summary != ''
  AND TRIM(summary) != ''
  AND (notes IS NULL OR notes = '' OR TRIM(notes) = '');

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
