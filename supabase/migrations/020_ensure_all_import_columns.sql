-- =====================================================
-- ENSURE ALL IMPORT COLUMNS EXIST
-- Migration 020 - Complete Import Column Parity
-- =====================================================
-- This migration ensures ALL columns needed for the
-- AI character import system exist. Run this if you
-- get "column not found" errors during import.
-- =====================================================

-- =====================================================
-- PART 1: vault_characters - All Import Fields
-- =====================================================

-- Physical appearance fields
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS weight TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS hair TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS eyes TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS skin TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS voice TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS distinguishing_marks TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS typical_attire TEXT;

-- Identity & Class
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS subclass TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS level INTEGER;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS alignment TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS deity TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS age TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS pronouns TEXT;

-- Personality expansion
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS ideals TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS bonds TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS flaws TEXT;

-- Backstory structure
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS backstory TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS backstory_phases JSONB;

-- AI-extracted arrays
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS quotes TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS plot_hooks TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS fears TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS tldr TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS gameplay_tips TEXT[];
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS open_questions TEXT[];

-- External links
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS external_links JSONB;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS theme_music_url TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS theme_music_title TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS character_sheet_url TEXT;

-- Story hooks
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS pre_session_hook TEXT;

-- Player info (OOC)
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS player_discord TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS player_timezone TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS player_experience TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS player_preferences JSONB;

-- Items & possessions
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS possessions JSONB;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;

-- Character writings & DM data
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS character_writings JSONB;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS rumors JSONB;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS dm_qa JSONB;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS party_relations JSONB;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS combat_stats JSONB;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS secondary_characters JSONB;

-- Import metadata
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS raw_document_text TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

-- =====================================================
-- PART 2: vault_character_relationships - NPC/Companion Fields
-- =====================================================

ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS faction_affiliations TEXT[];
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS needs TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS can_provide TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS goals TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS secrets TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS personality_traits TEXT[];
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS full_notes TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS is_companion BOOLEAN DEFAULT false;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS companion_type TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS companion_species TEXT;
ALTER TABLE vault_character_relationships ADD COLUMN IF NOT EXISTS companion_abilities TEXT;

-- =====================================================
-- PART 3: play_journal - Session Note Fields
-- =====================================================

ALTER TABLE play_journal ADD COLUMN IF NOT EXISTS campaign_name TEXT;
ALTER TABLE play_journal ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE play_journal ADD COLUMN IF NOT EXISTS kill_count INTEGER;
ALTER TABLE play_journal ADD COLUMN IF NOT EXISTS loot TEXT;
ALTER TABLE play_journal ADD COLUMN IF NOT EXISTS thoughts_for_next TEXT;
ALTER TABLE play_journal ADD COLUMN IF NOT EXISTS npcs_met TEXT[];
ALTER TABLE play_journal ADD COLUMN IF NOT EXISTS locations_visited TEXT[];

-- =====================================================
-- PART 4: Create vault_character_writings table if missing
-- =====================================================

CREATE TABLE IF NOT EXISTS vault_character_writings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  writing_type TEXT DEFAULT 'other',
  content TEXT NOT NULL,
  recipient TEXT,
  in_universe_date TEXT,
  session_reference TEXT,
  is_sent BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_vault_writings_character ON vault_character_writings(character_id);
CREATE INDEX IF NOT EXISTS idx_vault_writings_user ON vault_character_writings(user_id);

-- Enable RLS if not already
ALTER TABLE vault_character_writings ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they exist
DROP POLICY IF EXISTS "Users can view their own character writings" ON vault_character_writings;
DROP POLICY IF EXISTS "Users can insert their own character writings" ON vault_character_writings;
DROP POLICY IF EXISTS "Users can update their own character writings" ON vault_character_writings;
DROP POLICY IF EXISTS "Users can delete their own character writings" ON vault_character_writings;

CREATE POLICY "Users can view their own character writings"
  ON vault_character_writings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own character writings"
  ON vault_character_writings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own character writings"
  ON vault_character_writings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own character writings"
  ON vault_character_writings FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
