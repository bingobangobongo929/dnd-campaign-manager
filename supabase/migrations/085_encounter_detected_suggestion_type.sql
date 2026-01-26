-- ============================================================================
-- Migration 085: Add encounter_detected to suggestion_type enum
-- ============================================================================
-- This adds support for AI-detected encounters from session notes

-- First, drop any existing suggestion_type constraints
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'intelligence_suggestions'
        AND con.contype = 'c'
        AND con.conname LIKE '%suggestion_type%'
    LOOP
        EXECUTE 'ALTER TABLE intelligence_suggestions DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Now add the new constraint with encounter_detected included
-- This includes ALL suggestion types found in production + new ones
ALTER TABLE intelligence_suggestions ADD CONSTRAINT intelligence_suggestions_suggestion_type_check
CHECK (suggestion_type IN (
  -- Campaign Intelligence types
  'status_change', 'secret_revealed', 'story_hook', 'quote', 'important_person',
  'relationship', 'timeline_event', 'completeness', 'consistency',
  'npc_detected', 'location_detected', 'quest_detected', 'encounter_detected',
  'plot_hook', 'enrichment', 'timeline_issue', 'summary',
  -- Character Intelligence types
  'grammar', 'formatting', 'lore_conflict', 'redundancy',
  'voice_inconsistency', 'relationship_gap', 'secret_opportunity', 'cross_reference'
));
