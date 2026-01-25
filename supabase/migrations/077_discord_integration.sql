-- =====================================================
-- DISCORD INTEGRATION
-- Add Discord OAuth fields to user_settings and
-- discord_username to campaign_members for invites
-- =====================================================

-- Add Discord fields to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS discord_id TEXT,
ADD COLUMN IF NOT EXISTS discord_username TEXT,
ADD COLUMN IF NOT EXISTS discord_avatar TEXT,
ADD COLUMN IF NOT EXISTS discord_linked_at TIMESTAMPTZ;

-- Add unique constraint on discord_id to prevent duplicate links
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_discord_id
ON user_settings(discord_id) WHERE discord_id IS NOT NULL;

-- Add discord_username to campaign_members for display before user joins
ALTER TABLE campaign_members
ADD COLUMN IF NOT EXISTS discord_username TEXT;

-- Index for Discord username lookups during invite matching
CREATE INDEX IF NOT EXISTS idx_campaign_members_discord_username
ON campaign_members(discord_username) WHERE discord_username IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN user_settings.discord_id IS 'Discord user ID (immutable, numeric string)';
COMMENT ON COLUMN user_settings.discord_username IS 'Discord username (can change)';
COMMENT ON COLUMN user_settings.discord_avatar IS 'Discord avatar hash for constructing avatar URL';
COMMENT ON COLUMN user_settings.discord_linked_at IS 'When Discord was linked to this account';
COMMENT ON COLUMN campaign_members.discord_username IS 'Discord username entered by DM when inviting (for matching before user joins)';
