-- =====================================================
-- PARTY MEMBER FLAG
-- Migration 023 - Add is_party_member to relationships
-- =====================================================
-- Adds a flag to distinguish party members (PCs the user
-- plays with) from NPCs in the vault_character_relationships
-- table. This enables a separate "Party Members" section
-- in the People tab.
-- =====================================================

-- Add party member flag to relationships
ALTER TABLE vault_character_relationships
ADD COLUMN IF NOT EXISTS is_party_member BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN vault_character_relationships.is_party_member IS
'True if this relationship is a party member (PC) the user plays with, false for NPCs';

-- Create index for efficient filtering of party members
CREATE INDEX IF NOT EXISTS idx_vault_relationships_party_member
ON vault_character_relationships(character_id, is_party_member)
WHERE is_party_member = TRUE;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
