-- ============================================
-- Migration 043: Template Draft Support
--
-- Re-adds 'template' to content_mode to support editable template drafts.
--
-- Content modes:
-- - 'active' = Regular working content
-- - 'inactive' = Archived/retired content
-- - 'template' = Template draft (editable, not yet published/shared)
--
-- The workflow is:
-- 1. User clicks "Save to my Templates" on active content
-- 2. Creates a copy with content_mode='template' (template draft)
-- 3. User edits the template draft to make it session-0 ready
-- 4. User publishes it (creates snapshot in template_snapshots)
-- 5. User can then share the template
-- ============================================

-- Update constraint on campaigns to allow 'template'
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_content_mode_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_content_mode_check
  CHECK (content_mode IN ('active', 'inactive', 'template'));

-- Update constraint on vault_characters to allow 'template'
ALTER TABLE vault_characters DROP CONSTRAINT IF EXISTS vault_characters_content_mode_check;
ALTER TABLE vault_characters ADD CONSTRAINT vault_characters_content_mode_check
  CHECK (content_mode IN ('active', 'inactive', 'template'));

-- Update constraint on oneshots to allow 'template'
ALTER TABLE oneshots DROP CONSTRAINT IF EXISTS oneshots_content_mode_check;
ALTER TABLE oneshots ADD CONSTRAINT oneshots_content_mode_check
  CHECK (content_mode IN ('active', 'inactive', 'template'));

-- Add index for filtering by content_mode (useful for template tab queries)
CREATE INDEX IF NOT EXISTS idx_campaigns_content_mode ON campaigns(content_mode);
CREATE INDEX IF NOT EXISTS idx_vault_characters_content_mode ON vault_characters(content_mode);
CREATE INDEX IF NOT EXISTS idx_oneshots_content_mode ON oneshots(content_mode);
