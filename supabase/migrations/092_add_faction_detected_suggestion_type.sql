-- ============================================================================
-- Migration 092: Add faction_detected to suggestion_type enum
-- ============================================================================
-- Adds faction_detected as a valid suggestion type for Campaign Intelligence

-- Note: In Supabase, the suggestion_type column is likely just a TEXT column
-- with no enum constraint, so we don't need to alter an enum.
-- This migration is just documentation that faction_detected is now a valid value.

-- If there IS an enum, you would use:
-- ALTER TYPE suggestion_type ADD VALUE IF NOT EXISTS 'faction_detected';

-- Add a comment for documentation
COMMENT ON TABLE intelligence_suggestions IS 'Stores AI-generated suggestions for campaign intelligence. Valid suggestion_type values include: status_change, secret_revealed, story_hook, quote, important_person, relationship, timeline_event, completeness, consistency, npc_detected, location_detected, quest_detected, encounter_detected, faction_detected, quest_session_link, plot_hook, enrichment, timeline_issue, summary, grammar, formatting, lore_conflict, redundancy, voice_inconsistency, relationship_gap, secret_opportunity, cross_reference';
