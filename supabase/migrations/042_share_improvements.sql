-- ============================================
-- Migration 042: Share System Improvements
-- Adds password protection and share_type for party vs template shares
-- ============================================

-- Add password support to share tables
ALTER TABLE campaign_shares ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE character_shares ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE oneshot_shares ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add share type to distinguish party shares (view-only live content) vs template shares (saveable snapshots)
-- Default to 'party' for backward compatibility with existing shares
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaign_shares' AND column_name = 'share_type'
    ) THEN
        ALTER TABLE campaign_shares ADD COLUMN share_type TEXT DEFAULT 'party'
            CHECK (share_type IN ('party', 'template'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'character_shares' AND column_name = 'share_type'
    ) THEN
        ALTER TABLE character_shares ADD COLUMN share_type TEXT DEFAULT 'party'
            CHECK (share_type IN ('party', 'template'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'oneshot_shares' AND column_name = 'share_type'
    ) THEN
        ALTER TABLE oneshot_shares ADD COLUMN share_type TEXT DEFAULT 'party'
            CHECK (share_type IN ('party', 'template'));
    END IF;
END $$;

-- Index for looking up shares by type (useful for listing party vs template shares)
CREATE INDEX IF NOT EXISTS idx_campaign_shares_type ON campaign_shares(share_type);
CREATE INDEX IF NOT EXISTS idx_character_shares_type ON character_shares(share_type);
CREATE INDEX IF NOT EXISTS idx_oneshot_shares_type ON oneshot_shares(share_type);

-- Index for password-protected shares (quick check if share has password)
CREATE INDEX IF NOT EXISTS idx_campaign_shares_has_password ON campaign_shares((password_hash IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_character_shares_has_password ON character_shares((password_hash IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_oneshot_shares_has_password ON oneshot_shares((password_hash IS NOT NULL));

-- Add comment explaining the share_type distinction
COMMENT ON COLUMN campaign_shares.share_type IS 'party = view-only link to live content for party members; template = link to frozen snapshot that can be saved';
COMMENT ON COLUMN character_shares.share_type IS 'party = view-only link to live content for party members; template = link to frozen snapshot that can be saved';
COMMENT ON COLUMN oneshot_shares.share_type IS 'party = view-only link to live content for party members; template = link to frozen snapshot that can be saved';

COMMENT ON COLUMN campaign_shares.password_hash IS 'bcrypt hash of password for protected shares. NULL means no password required.';
COMMENT ON COLUMN character_shares.password_hash IS 'bcrypt hash of password for protected shares. NULL means no password required.';
COMMENT ON COLUMN oneshot_shares.password_hash IS 'bcrypt hash of password for protected shares. NULL means no password required.';
