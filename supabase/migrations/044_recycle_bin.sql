-- ============================================
-- Migration 044: Recycle Bin / Soft Delete
--
-- Implements soft delete for all major content types.
-- Deleted items are retained for 30 days before auto-purge.
--
-- How it works:
-- - deleted_at = NULL means active content
-- - deleted_at = timestamp means soft-deleted
-- - Daily cron purges items where deleted_at < NOW() - 30 days
-- ============================================

-- ============================================
-- PART 1: Add deleted_at columns
-- ============================================

-- Campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Vault Characters
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Oneshots
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================
-- PART 2: Add indexes for performance
-- Queries frequently filter on deleted_at IS NULL
-- ============================================

CREATE INDEX IF NOT EXISTS idx_campaigns_deleted_at ON campaigns(deleted_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(user_id, deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vault_characters_deleted_at ON vault_characters(deleted_at);
CREATE INDEX IF NOT EXISTS idx_vault_characters_active ON vault_characters(user_id, deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_oneshots_deleted_at ON oneshots(deleted_at);
CREATE INDEX IF NOT EXISTS idx_oneshots_active ON oneshots(user_id, deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- PART 3: Update RLS policies to exclude deleted content
-- Users should not see deleted content in normal queries
-- ============================================

-- Drop existing select policies and recreate with deleted_at filter
-- CAMPAIGNS
DROP POLICY IF EXISTS "Users can view own campaigns" ON campaigns;
CREATE POLICY "Users can view own campaigns" ON campaigns
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- New policy specifically for recycle bin access
CREATE POLICY "Users can view own deleted campaigns" ON campaigns
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- VAULT CHARACTERS
DROP POLICY IF EXISTS "Users can view own vault characters" ON vault_characters;
CREATE POLICY "Users can view own vault characters" ON vault_characters
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view own deleted vault characters" ON vault_characters
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- ONESHOTS
DROP POLICY IF EXISTS "Users can view own oneshots" ON oneshots;
CREATE POLICY "Users can view own oneshots" ON oneshots
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view own deleted oneshots" ON oneshots
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- ============================================
-- PART 4: Function to purge old deleted items
-- Called by cron job daily
-- ============================================

CREATE OR REPLACE FUNCTION purge_deleted_content()
RETURNS void AS $$
DECLARE
  purged_campaigns INTEGER;
  purged_characters INTEGER;
  purged_oneshots INTEGER;
BEGIN
  -- Delete campaigns older than 30 days
  -- CASCADE will handle related data (characters, tags, lore, etc.)
  WITH deleted AS (
    DELETE FROM campaigns
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO purged_campaigns FROM deleted;

  -- Delete vault characters older than 30 days
  WITH deleted AS (
    DELETE FROM vault_characters
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO purged_characters FROM deleted;

  -- Delete oneshots older than 30 days
  WITH deleted AS (
    DELETE FROM oneshots
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO purged_oneshots FROM deleted;

  -- Log the purge results
  RAISE NOTICE 'Purged % campaigns, % characters, % oneshots',
    purged_campaigns, purged_characters, purged_oneshots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: Auto-purge setup
--
-- IMPORTANT: The auto-purge needs to delete storage files (images),
-- which cannot be done from SQL. Instead, use the API endpoint:
--
-- GET /api/recycle-bin/auto-purge
--
-- Set up one of these options:
--
-- Option A: Vercel Cron (recommended for Vercel deployments)
-- Add to vercel.json:
--   {
--     "crons": [{
--       "path": "/api/recycle-bin/auto-purge",
--       "schedule": "0 3 * * *"
--     }]
--   }
--
-- Option B: External cron service (cron-job.org, etc.)
-- Set up a daily GET request to your domain with header:
--   x-cron-secret: <your CRON_SECRET env var>
--
-- The purge_deleted_content() SQL function is kept for manual use
-- but does NOT clean up storage files.
-- ============================================

-- ============================================
-- PART 6: Helper function to soft delete
-- ============================================

CREATE OR REPLACE FUNCTION soft_delete_content(
  p_content_type TEXT,
  p_content_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  CASE p_content_type
    WHEN 'campaign' THEN
      UPDATE campaigns
      SET deleted_at = NOW()
      WHERE id = p_content_id AND user_id = p_user_id AND deleted_at IS NULL;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    WHEN 'character' THEN
      UPDATE vault_characters
      SET deleted_at = NOW()
      WHERE id = p_content_id AND user_id = p_user_id AND deleted_at IS NULL;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    WHEN 'oneshot' THEN
      UPDATE oneshots
      SET deleted_at = NOW()
      WHERE id = p_content_id AND user_id = p_user_id AND deleted_at IS NULL;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSE
      RETURN FALSE;
  END CASE;

  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 7: Helper function to restore
-- ============================================

CREATE OR REPLACE FUNCTION restore_deleted_content(
  p_content_type TEXT,
  p_content_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  CASE p_content_type
    WHEN 'campaign' THEN
      UPDATE campaigns
      SET deleted_at = NULL
      WHERE id = p_content_id AND user_id = p_user_id AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    WHEN 'character' THEN
      UPDATE vault_characters
      SET deleted_at = NULL
      WHERE id = p_content_id AND user_id = p_user_id AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    WHEN 'oneshot' THEN
      UPDATE oneshots
      SET deleted_at = NULL
      WHERE id = p_content_id AND user_id = p_user_id AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSE
      RETURN FALSE;
  END CASE;

  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 8: Helper function to permanently delete
-- ============================================

CREATE OR REPLACE FUNCTION permanently_delete_content(
  p_content_type TEXT,
  p_content_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Only allow permanent delete of already soft-deleted content
  CASE p_content_type
    WHEN 'campaign' THEN
      DELETE FROM campaigns
      WHERE id = p_content_id AND user_id = p_user_id AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    WHEN 'character' THEN
      DELETE FROM vault_characters
      WHERE id = p_content_id AND user_id = p_user_id AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    WHEN 'oneshot' THEN
      DELETE FROM oneshots
      WHERE id = p_content_id AND user_id = p_user_id AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS rows_affected = ROW_COUNT;

    ELSE
      RETURN FALSE;
  END CASE;

  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================

COMMENT ON COLUMN campaigns.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = in recycle bin. Auto-purged after 30 days.';
COMMENT ON COLUMN vault_characters.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = in recycle bin. Auto-purged after 30 days.';
COMMENT ON COLUMN oneshots.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = in recycle bin. Auto-purged after 30 days.';

COMMENT ON FUNCTION purge_deleted_content() IS 'Permanently deletes content that has been in recycle bin for more than 30 days. Called by daily cron job.';
COMMENT ON FUNCTION soft_delete_content(TEXT, UUID, UUID) IS 'Soft deletes content by setting deleted_at timestamp.';
COMMENT ON FUNCTION restore_deleted_content(TEXT, UUID, UUID) IS 'Restores soft-deleted content by clearing deleted_at.';
COMMENT ON FUNCTION permanently_delete_content(TEXT, UUID, UUID) IS 'Permanently deletes content that is already in recycle bin.';
