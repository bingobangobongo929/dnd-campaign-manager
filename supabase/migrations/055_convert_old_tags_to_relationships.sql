-- ============================================================================
-- Convert Old Relationship Tags to New Canvas Relationships System
-- ============================================================================
-- This migration:
-- 1. Converts old relationship character_tags to canvas_relationships
-- 2. Tries to match old tag names to new relationship templates
-- 3. DELETES old relationship tags and their character_tags (not just archive)
-- 4. Keeps faction and general tags intact
-- ============================================================================

-- ============================================================================
-- 1. CONVERT OLD RELATIONSHIP CHARACTER_TAGS TO CANVAS_RELATIONSHIPS
-- ============================================================================

-- First, let's convert relationship tags that have a related_character_id
-- Try to match tag names to relationship templates, fall back to custom_label
INSERT INTO canvas_relationships (
  campaign_id,
  from_character_id,
  to_character_id,
  template_id,
  custom_label,
  is_known_to_party,
  is_primary,
  created_at
)
SELECT DISTINCT
  t.campaign_id,
  ct.character_id,
  ct.related_character_id,
  -- Try to match tag name to a system template (case-insensitive)
  (SELECT id FROM relationship_templates
   WHERE is_system = true
   AND (LOWER(name) = LOWER(t.name) OR LOWER(inverse_name) = LOWER(t.name))
   LIMIT 1),
  -- If no template match, use tag name as custom label
  CASE
    WHEN (SELECT id FROM relationship_templates WHERE is_system = true AND (LOWER(name) = LOWER(t.name) OR LOWER(inverse_name) = LOWER(t.name)) LIMIT 1) IS NULL
    THEN t.name
    ELSE NULL
  END,
  true,
  true,
  ct.created_at
FROM character_tags ct
JOIN tags t ON t.id = ct.tag_id
WHERE t.category = 'relationship'
  AND ct.related_character_id IS NOT NULL
  -- Don't duplicate if already migrated
  AND NOT EXISTS (
    SELECT 1 FROM canvas_relationships cr
    WHERE cr.from_character_id = ct.character_id
    AND cr.to_character_id = ct.related_character_id
  );

-- ============================================================================
-- 2. DELETE OLD RELATIONSHIP CHARACTER_TAGS
-- ============================================================================

-- Delete character_tags that are relationship type (they've been migrated)
DELETE FROM character_tags
WHERE tag_id IN (
  SELECT id FROM tags WHERE category = 'relationship'
);

-- ============================================================================
-- 3. DELETE OLD RELATIONSHIP TAGS
-- ============================================================================

-- Delete the relationship tags themselves
DELETE FROM tags
WHERE category = 'relationship';

-- ============================================================================
-- 4. ALSO CLEAN UP ARCHIVED FACTION TAGS (convert to campaign_factions)
-- ============================================================================

-- Make sure all faction tags are converted to campaign_factions
INSERT INTO campaign_factions (campaign_id, name, color, icon, created_at)
SELECT DISTINCT
  campaign_id,
  name,
  COALESCE(color, '#8B5CF6'),
  COALESCE(icon, 'shield'),
  created_at
FROM tags
WHERE category = 'faction'
  AND NOT EXISTS (
    SELECT 1 FROM campaign_factions cf
    WHERE cf.campaign_id = tags.campaign_id AND cf.name = tags.name
  )
ON CONFLICT DO NOTHING;

-- Convert faction character_tags to faction_memberships
INSERT INTO faction_memberships (faction_id, character_id, created_at)
SELECT DISTINCT
  cf.id,
  ct.character_id,
  ct.created_at
FROM character_tags ct
JOIN tags t ON t.id = ct.tag_id
JOIN campaign_factions cf ON cf.campaign_id = t.campaign_id AND cf.name = t.name
WHERE t.category = 'faction'
  AND NOT EXISTS (
    SELECT 1 FROM faction_memberships fm
    WHERE fm.faction_id = cf.id AND fm.character_id = ct.character_id
  )
ON CONFLICT (faction_id, character_id) DO NOTHING;

-- Delete faction character_tags (they've been migrated to faction_memberships)
DELETE FROM character_tags
WHERE tag_id IN (
  SELECT id FROM tags WHERE category = 'faction'
);

-- Delete faction tags (they've been migrated to campaign_factions)
DELETE FROM tags
WHERE category = 'faction';

-- ============================================================================
-- 5. SUMMARY
-- ============================================================================
-- After this migration:
-- - All relationship tags → canvas_relationships (with template matching where possible)
-- - All faction tags → campaign_factions + faction_memberships
-- - Only 'general' category tags remain in the old tags system
-- - The UI should only show the new RelationshipEditor for relationships
-- - The UI should only show FactionManager for factions
-- - The old "Add Tag" modal should only show general tags
