-- ============================================================================
-- Migration 085: Add encounter_detected to suggestion_type enum
-- ============================================================================
-- This adds support for AI-detected encounters from session notes

-- The intelligence_suggestions table uses a check constraint for suggestion_type
-- We need to drop and recreate it to add the new value

ALTER TABLE intelligence_suggestions DROP CONSTRAINT IF EXISTS intelligence_suggestions_suggestion_type_check;

ALTER TABLE intelligence_suggestions ADD CONSTRAINT intelligence_suggestions_suggestion_type_check
CHECK (suggestion_type IN (
  'status_change', 'secret_revealed', 'story_hook', 'quote', 'important_person',
  'relationship', 'timeline_event', 'completeness', 'consistency',
  'npc_detected', 'location_detected', 'quest_detected', 'encounter_detected',
  'plot_hook', 'enrichment', 'timeline_issue',
  'grammar', 'formatting', 'lore_conflict', 'redundancy',
  'voice_inconsistency', 'relationship_gap', 'secret_opportunity', 'cross_reference'
));
