-- =====================================================
-- CHARACTER FIELD SYNC
-- Migration 079 - Sync fields between vault_characters and campaign characters
-- =====================================================
-- This migration adds fields to campaign characters that exist in vault_characters
-- to enable proper syncing when players claim characters or link vault characters.
-- =====================================================

-- Add pronouns field to campaign characters (for player characters)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS pronouns TEXT;

-- Add D&D 5e personality system fields (ideals, bonds, flaws)
-- These are commonly used by players and should sync between vault and campaign
ALTER TABLE characters ADD COLUMN IF NOT EXISTS ideals TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS bonds TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS flaws TEXT;

-- Add character_sheet_url for external sheet links (D&D Beyond, etc.)
-- This is player-specific and should be editable by the player
ALTER TABLE characters ADD COLUMN IF NOT EXISTS character_sheet_url TEXT;

-- Add subclass and level for more complete character data
ALTER TABLE characters ADD COLUMN IF NOT EXISTS subclass TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS level INTEGER;

-- Add alignment (common D&D field)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS alignment TEXT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
