-- Add missing vault_characters columns
-- These columns exist in TypeScript types but were missing from the database

ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS tldr TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS character_sheet_url TEXT,
  ADD COLUMN IF NOT EXISTS theme_music_url TEXT,
  ADD COLUMN IF NOT EXISTS theme_music_title TEXT;
