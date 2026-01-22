-- ============================================================================
-- Migrate Existing Tags Data to New System
-- ============================================================================
-- This migration preserves all existing data while migrating:
-- 1. Faction tags → campaign_factions + faction_memberships
-- 2. Relationship character_tags → canvas_relationships
-- 3. Archives migrated tags (doesn't delete them)
--
-- IMPORTANT: This migration requires 053_tags_relationships_overhaul.sql
-- to have run successfully first!
-- ============================================================================

-- ============================================================================
-- 0. FIX: Add 'organization' to faction_type check constraint
-- ============================================================================
ALTER TABLE campaign_factions DROP CONSTRAINT IF EXISTS campaign_factions_faction_type_check;
ALTER TABLE campaign_factions ADD CONSTRAINT campaign_factions_faction_type_check
  CHECK (faction_type IN ('guild', 'kingdom', 'cult', 'family', 'military', 'criminal', 'religious', 'merchant', 'academic', 'organization', 'other'));

-- ============================================================================
-- 1. MIGRATE FACTION TAGS TO CAMPAIGN_FACTIONS
-- ============================================================================

-- Create factions from faction tags (only if tables exist and have faction category)
INSERT INTO campaign_factions (campaign_id, name, color, icon, created_at)
SELECT DISTINCT
  campaign_id,
  name,
  COALESCE(color, '#8B5CF6'),
  COALESCE(icon, 'shield'),
  created_at
FROM tags
WHERE category = 'faction'
  AND campaign_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create memberships for characters that have faction tags
INSERT INTO faction_memberships (faction_id, character_id, created_at)
SELECT DISTINCT
  cf.id,
  ct.character_id,
  ct.created_at
FROM character_tags ct
JOIN tags t ON t.id = ct.tag_id
JOIN campaign_factions cf ON cf.campaign_id = t.campaign_id AND cf.name = t.name
WHERE t.category = 'faction'
ON CONFLICT (faction_id, character_id) DO NOTHING;

-- ============================================================================
-- 2. MIGRATE RELATIONSHIP CHARACTER_TAGS TO CANVAS_RELATIONSHIPS
-- ============================================================================

-- Migrate relationship tags with related_character_id to canvas_relationships
INSERT INTO canvas_relationships (
  campaign_id,
  from_character_id,
  to_character_id,
  custom_label,
  is_known_to_party,
  created_at
)
SELECT DISTINCT
  t.campaign_id,
  ct.character_id,
  ct.related_character_id,
  t.name,
  true,
  ct.created_at
FROM character_tags ct
JOIN tags t ON t.id = ct.tag_id
JOIN characters c ON c.id = ct.character_id
WHERE t.category = 'relationship'
  AND ct.related_character_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Also migrate any data from the character_relationships table (from migration 007)
-- This is wrapped in a DO block since the table may not exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'character_relationships') THEN
    INSERT INTO canvas_relationships (
      campaign_id,
      from_character_id,
      to_character_id,
      custom_label,
      description,
      is_known_to_party,
      created_at
    )
    SELECT DISTINCT
      cr.campaign_id,
      cr.character_id,
      cr.related_character_id,
      COALESCE(cr.relationship_label, cr.relationship_type),
      cr.notes,
      COALESCE(cr.is_known_to_party, true),
      cr.created_at
    FROM character_relationships cr
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- 3. ARCHIVE MIGRATED TAGS (Don't delete, just hide)
-- ============================================================================

-- Archive faction tags that have been migrated
UPDATE tags
SET is_archived = true, updated_at = NOW()
WHERE category = 'faction'
  AND EXISTS (
    SELECT 1 FROM campaign_factions cf
    WHERE cf.campaign_id = tags.campaign_id AND cf.name = tags.name
  );

-- Archive relationship tags that have been migrated
UPDATE tags
SET is_archived = true, updated_at = NOW()
WHERE category = 'relationship'
  AND EXISTS (
    SELECT 1 FROM character_tags ct
    WHERE ct.tag_id = tags.id AND ct.related_character_id IS NOT NULL
  );

-- ============================================================================
-- 4. ADD HELPER COMMENT
-- ============================================================================
-- Note: Original tags and character_tags data is preserved for rollback purposes.
-- The old tags are marked as archived (is_archived = true) and won't appear in UI.
-- General/categorical tags (category = 'general') continue to work as before.
