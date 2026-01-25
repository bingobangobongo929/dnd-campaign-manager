-- Migration: Vault Character Source Tracking
-- Adds fields to track where vault characters came from (original, linked, session_0, export)
-- and enables grouping related character versions together

-- Source type for vault characters
-- 'original' - Player's own vault character (default)
-- 'linked' - Synced copy connected to a campaign (view-only in vault)
-- 'session_0' - Frozen snapshot from before campaign history began
-- 'export' - Snapshot taken at any point during/after campaign (journey export)

ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'original';

-- Reference to the source campaign (null for original characters)
ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS source_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- Preserved campaign name in case campaign is deleted
ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS source_campaign_name TEXT;

-- Reference to the campaign character this was exported from
ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS source_campaign_character_id UUID REFERENCES characters(id) ON DELETE SET NULL;

-- When the snapshot was taken
ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS source_snapshot_date TIMESTAMPTZ;

-- Session number at time of export (for display purposes)
ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS source_session_number INTEGER;

-- For grouping related character versions together
-- All versions of the "same" character share this ID
-- Original characters set this to their own ID, copies inherit from source
ALTER TABLE vault_characters
ADD COLUMN IF NOT EXISTS character_lineage_id UUID;

-- Add constraint to validate source_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vault_characters_source_type_check'
  ) THEN
    ALTER TABLE vault_characters
    ADD CONSTRAINT vault_characters_source_type_check
    CHECK (source_type IN ('original', 'linked', 'session_0', 'export'));
  END IF;
END $$;

-- Set lineage_id to self for all existing characters (they're all originals)
UPDATE vault_characters
SET character_lineage_id = id
WHERE character_lineage_id IS NULL;

-- Create index for efficient lineage queries (find all versions of a character)
CREATE INDEX IF NOT EXISTS idx_vault_characters_lineage
ON vault_characters(character_lineage_id);

-- Create index for source campaign lookups
CREATE INDEX IF NOT EXISTS idx_vault_characters_source_campaign
ON vault_characters(source_campaign_id)
WHERE source_campaign_id IS NOT NULL;

-- Create index for source type filtering
CREATE INDEX IF NOT EXISTS idx_vault_characters_source_type
ON vault_characters(source_type);

COMMENT ON COLUMN vault_characters.source_type IS 'Type of character copy: original (player created), linked (synced to campaign), session_0 (pre-campaign snapshot), export (journey snapshot)';
COMMENT ON COLUMN vault_characters.source_campaign_id IS 'Campaign this character was exported from (null for originals)';
COMMENT ON COLUMN vault_characters.source_campaign_name IS 'Campaign name preserved in case original campaign is deleted';
COMMENT ON COLUMN vault_characters.source_campaign_character_id IS 'Campaign character this was exported from';
COMMENT ON COLUMN vault_characters.source_snapshot_date IS 'When this snapshot was taken';
COMMENT ON COLUMN vault_characters.source_session_number IS 'Session number at time of export, for display';
COMMENT ON COLUMN vault_characters.character_lineage_id IS 'Groups all versions of the same character together';
