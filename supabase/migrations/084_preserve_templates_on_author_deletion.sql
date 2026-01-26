-- ============================================
-- Migration 084: Preserve Templates When Author Deletes Account
--
-- GDPR Consideration:
-- When a user deletes their account, their published templates should
-- remain available to users who saved them. The template becomes
-- "orphaned" (anonymous) rather than deleted.
--
-- This prevents data loss for users who saved templates to their
-- collection before the author deleted their account.
-- ============================================

-- Step 1: Add a column to track if the original author account exists
ALTER TABLE template_snapshots
ADD COLUMN IF NOT EXISTS author_deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN template_snapshots.author_deleted_at IS 'Set when original author deletes their account - template becomes orphaned/anonymous';

-- Step 2: Change the foreign key from CASCADE to SET NULL
-- This requires dropping and recreating the constraint

-- First, drop the existing foreign key constraint
ALTER TABLE template_snapshots
DROP CONSTRAINT IF EXISTS template_snapshots_user_id_fkey;

-- Make user_id nullable (required for SET NULL to work)
ALTER TABLE template_snapshots
ALTER COLUMN user_id DROP NOT NULL;

-- Recreate with ON DELETE SET NULL instead of CASCADE
ALTER TABLE template_snapshots
ADD CONSTRAINT template_snapshots_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 3: Create a trigger to set author_deleted_at when user_id becomes null
CREATE OR REPLACE FUNCTION mark_template_author_deleted()
RETURNS TRIGGER AS $$
BEGIN
  -- When user_id is set to NULL (from account deletion), record the timestamp
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.author_deleted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_template_author_deleted ON template_snapshots;
CREATE TRIGGER trigger_mark_template_author_deleted
  BEFORE UPDATE ON template_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION mark_template_author_deleted();

-- Step 4: Update content_saves to handle orphaned templates gracefully
-- The source_owner_id should also be SET NULL when the owner is deleted

ALTER TABLE content_saves
DROP CONSTRAINT IF EXISTS content_saves_source_owner_fkey;

-- Note: source_owner_id may not have had a foreign key constraint
-- but let's ensure it's nullable for orphaned templates
ALTER TABLE content_saves
ALTER COLUMN source_owner_id DROP NOT NULL;

-- Step 5: Update RLS policy to allow viewing orphaned templates
-- (Templates where user_id is NULL should still be viewable)
DROP POLICY IF EXISTS "Anyone can view public templates" ON template_snapshots;
CREATE POLICY "Anyone can view public templates" ON template_snapshots
  FOR SELECT USING (
    is_public = TRUE
    OR auth.uid() = user_id
    OR user_id IS NULL  -- Orphaned templates are viewable
  );

-- Step 6: Add index for finding orphaned templates (admin purposes)
CREATE INDEX IF NOT EXISTS idx_template_snapshots_orphaned
ON template_snapshots(author_deleted_at)
WHERE author_deleted_at IS NOT NULL;

-- ============================================
-- Summary:
-- - Published templates now survive author account deletion
-- - Templates become "orphaned" with user_id = NULL
-- - author_deleted_at tracks when this happened
-- - content_saves remain intact pointing to orphaned templates
-- - "Started Playing" copies were already safe (SET NULL on template_id)
-- ============================================
