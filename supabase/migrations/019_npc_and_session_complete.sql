-- =====================================================
-- NPC AND SESSION NOTES COMPLETE OVERHAUL
-- Migration 019 - Complete Character Import Support
-- =====================================================
-- This migration enhances the relationship and session
-- systems to support COMPLETE data capture from character
-- documents with ZERO data loss.
-- =====================================================

-- =====================================================
-- PART 1: ENHANCE vault_character_relationships FOR NPCs
-- =====================================================
-- The existing table has basic fields. Add comprehensive
-- NPC detail fields to capture ALL bullet point information.

-- Nickname (e.g., "Orchpyre" for Giselbert)
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Faction affiliations (e.g., ["Talebheim 11", "Hexenguild"])
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS faction_affiliations TEXT[];

-- Location where they can be found
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS location TEXT;

-- What they need from the PC
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS needs TEXT;

-- What they can provide (favors, help, items)
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS can_provide TEXT;

-- Their personal goals
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS goals TEXT;

-- Their secrets
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS secrets TEXT;

-- Personality traits
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS personality_traits TEXT[];

-- CRITICAL: Full notes field stores ALL bullet points
-- This ensures ZERO data loss even if structured fields miss something
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS full_notes TEXT;

-- Their occupation/role
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Origin/background info
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS origin TEXT;

-- Whether this is a companion (pet, familiar, mount) vs NPC
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS is_companion BOOLEAN DEFAULT false;

-- Companion type (familiar, pet, mount, animal companion)
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS companion_type TEXT;

-- Companion species (ferret, dog, horse, etc.)
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS companion_species TEXT;

-- Companion abilities
ALTER TABLE vault_character_relationships
  ADD COLUMN IF NOT EXISTS companion_abilities TEXT;

COMMENT ON COLUMN vault_character_relationships.nickname IS 'NPC nickname or alias (e.g., "Orchpyre")';
COMMENT ON COLUMN vault_character_relationships.faction_affiliations IS 'Groups/organizations they belong to';
COMMENT ON COLUMN vault_character_relationships.location IS 'Where they can typically be found';
COMMENT ON COLUMN vault_character_relationships.needs IS 'What they need from the PC';
COMMENT ON COLUMN vault_character_relationships.can_provide IS 'What favors/help/items they can offer';
COMMENT ON COLUMN vault_character_relationships.goals IS 'Their personal goals and motivations';
COMMENT ON COLUMN vault_character_relationships.secrets IS 'Secrets they hold';
COMMENT ON COLUMN vault_character_relationships.personality_traits IS 'Key personality traits';
COMMENT ON COLUMN vault_character_relationships.full_notes IS 'ALL bullet points/notes - ensures zero data loss';
COMMENT ON COLUMN vault_character_relationships.is_companion IS 'True if this is a companion (pet/familiar/mount) vs NPC';
COMMENT ON COLUMN vault_character_relationships.companion_type IS 'Type: familiar, pet, mount, animal_companion';
COMMENT ON COLUMN vault_character_relationships.companion_species IS 'Species: ferret, dog, horse, etc.';

-- =====================================================
-- PART 2: ENHANCE play_journal FOR RICHER SESSION NOTES
-- =====================================================

-- Campaign name (which campaign these sessions belong to)
ALTER TABLE play_journal
  ADD COLUMN IF NOT EXISTS campaign_name TEXT;

-- Brief summary separate from detailed notes
ALTER TABLE play_journal
  ADD COLUMN IF NOT EXISTS summary TEXT;

-- Kill count for this session
ALTER TABLE play_journal
  ADD COLUMN IF NOT EXISTS kill_count INTEGER;

-- Loot acquired
ALTER TABLE play_journal
  ADD COLUMN IF NOT EXISTS loot TEXT;

-- Thoughts/plans for next session
ALTER TABLE play_journal
  ADD COLUMN IF NOT EXISTS thoughts_for_next TEXT;

-- NPCs met this session
ALTER TABLE play_journal
  ADD COLUMN IF NOT EXISTS npcs_met TEXT[];

-- Locations visited
ALTER TABLE play_journal
  ADD COLUMN IF NOT EXISTS locations_visited TEXT[];

COMMENT ON COLUMN play_journal.campaign_name IS 'Which campaign this session belongs to';
COMMENT ON COLUMN play_journal.summary IS 'Brief session summary';
COMMENT ON COLUMN play_journal.kill_count IS 'Number of kills this session';
COMMENT ON COLUMN play_journal.loot IS 'Items/gold acquired';
COMMENT ON COLUMN play_journal.thoughts_for_next IS 'Plans and thoughts for next session';
COMMENT ON COLUMN play_journal.npcs_met IS 'NPCs encountered this session';
COMMENT ON COLUMN play_journal.locations_visited IS 'Places visited this session';

CREATE INDEX IF NOT EXISTS idx_play_journal_campaign ON play_journal(campaign_name);

-- =====================================================
-- PART 3: ADD MISSING FIELDS TO vault_characters
-- =====================================================

-- Quotes/voice lines
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS quotes TEXT[];

COMMENT ON COLUMN vault_characters.quotes IS 'Voice lines and catchphrases';

-- Plot hooks for DMs ("Knives")
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS plot_hooks TEXT[];

COMMENT ON COLUMN vault_characters.plot_hooks IS 'Story hooks for DMs to use';

-- TL;DR summary
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS tldr TEXT;

COMMENT ON COLUMN vault_characters.tldr IS 'Brief bullet-point summary of character';

-- External links (D&D Beyond, YouTube, etc.)
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS external_links JSONB;
-- Format: [{url: "...", label: "Character Sheet", type: "dndbeyond"}]

COMMENT ON COLUMN vault_characters.external_links IS 'External links: [{url, label, type}]';

-- Pre-session hook (what brought them to the party)
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS pre_session_hook TEXT;

COMMENT ON COLUMN vault_characters.pre_session_hook IS 'What brought this character to the adventure';

-- Fears
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS fears TEXT[];

COMMENT ON COLUMN vault_characters.fears IS 'Things the character is afraid of';

-- Secondary character ideas (other concepts attached to this character)
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS secondary_characters JSONB;
-- Format: [{name: "...", concept: "...", notes: "..."}]

COMMENT ON COLUMN vault_characters.secondary_characters IS 'Other character concepts stored with this one';

-- Theme music URL (separate from full external_links for easy access)
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS theme_music_url TEXT;

COMMENT ON COLUMN vault_characters.theme_music_url IS 'YouTube or other link to character theme music';

-- D&D Beyond sheet URL (separate for easy access)
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS character_sheet_url TEXT;

COMMENT ON COLUMN vault_characters.character_sheet_url IS 'Link to D&D Beyond or other character sheet';

-- =====================================================
-- PART 4: CREATE FUNCTION TO MIGRATE story_characters
-- =====================================================
-- This function copies data from the old story_characters
-- table to vault_character_relationships

CREATE OR REPLACE FUNCTION migrate_story_characters_to_relationships()
RETURNS void AS $$
BEGIN
  -- Insert story_characters into vault_character_relationships
  -- Only if not already present (avoid duplicates)
  INSERT INTO vault_character_relationships (
    user_id,
    character_id,
    related_name,
    related_image_url,
    relationship_type,
    relationship_label,
    description,
    full_notes,
    display_order,
    created_at
  )
  SELECT
    vc.user_id,
    sc.character_id,
    sc.name,
    sc.image_url,
    sc.relationship,
    sc.relationship,
    sc.tagline,
    sc.notes,
    sc.sort_order,
    sc.created_at
  FROM story_characters sc
  JOIN vault_characters vc ON sc.character_id = vc.id
  WHERE NOT EXISTS (
    SELECT 1 FROM vault_character_relationships vcr
    WHERE vcr.character_id = sc.character_id
    AND vcr.related_name = sc.name
  );
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_story_characters_to_relationships();

-- =====================================================
-- PART 5: CREATE COMPREHENSIVE FETCH FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_character_with_all_relations(p_character_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'character', row_to_json(vc),
    'npcs', (
      SELECT COALESCE(json_agg(row_to_json(vcr) ORDER BY vcr.display_order), '[]'::json)
      FROM vault_character_relationships vcr
      WHERE vcr.character_id = p_character_id
      AND (vcr.is_companion IS NULL OR vcr.is_companion = false)
    ),
    'companions', (
      SELECT COALESCE(json_agg(row_to_json(vcr) ORDER BY vcr.display_order), '[]'::json)
      FROM vault_character_relationships vcr
      WHERE vcr.character_id = p_character_id
      AND vcr.is_companion = true
    ),
    'images', (
      SELECT COALESCE(json_agg(row_to_json(vci) ORDER BY vci.display_order), '[]'::json)
      FROM vault_character_images vci
      WHERE vci.character_id = p_character_id
    ),
    'sessions', (
      SELECT COALESCE(json_agg(row_to_json(pj) ORDER BY pj.session_number), '[]'::json)
      FROM play_journal pj
      WHERE pj.character_id = p_character_id
    ),
    'writings', (
      SELECT COALESCE(json_agg(row_to_json(vcw) ORDER BY vcw.display_order), '[]'::json)
      FROM vault_character_writings vcw
      WHERE vcw.character_id = p_character_id
    )
  ) INTO result
  FROM vault_characters vc
  WHERE vc.id = p_character_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
