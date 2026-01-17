-- Share Tracking Enhancements
-- Creates share tables if they don't exist
-- Adds last_viewed_at and note to all share tables
-- Creates share_view_events table for detailed view tracking

-- =====================================================
-- CREATE SHARE TABLES IF THEY DON'T EXIST
-- =====================================================

-- Character Shares
CREATE TABLE IF NOT EXISTS character_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT UNIQUE NOT NULL,
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  included_sections JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_shares_code ON character_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_character_shares_character ON character_shares(character_id);

-- Character Shares RLS
ALTER TABLE character_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their character shares" ON character_shares;
CREATE POLICY "Users can manage their character shares"
  ON character_shares FOR ALL
  USING (
    character_id IN (
      SELECT id FROM vault_characters WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view shared characters by code" ON character_shares;
CREATE POLICY "Anyone can view shared characters by code"
  ON character_shares FOR SELECT
  USING (
    (expires_at IS NULL OR expires_at > NOW())
  );

-- Oneshot Shares
CREATE TABLE IF NOT EXISTS oneshot_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT UNIQUE NOT NULL,
  oneshot_id UUID NOT NULL REFERENCES oneshots(id) ON DELETE CASCADE,
  included_sections JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oneshot_shares_code ON oneshot_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_oneshot_shares_oneshot ON oneshot_shares(oneshot_id);

-- Oneshot Shares RLS
ALTER TABLE oneshot_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their oneshot shares" ON oneshot_shares;
CREATE POLICY "Users can manage their oneshot shares"
  ON oneshot_shares FOR ALL
  USING (
    oneshot_id IN (
      SELECT id FROM oneshots WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view shared oneshots by code" ON oneshot_shares;
CREATE POLICY "Anyone can view shared oneshots by code"
  ON oneshot_shares FOR SELECT
  USING (
    (expires_at IS NULL OR expires_at > NOW())
  );

-- Campaign Shares
CREATE TABLE IF NOT EXISTS campaign_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT UNIQUE NOT NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  share_type TEXT DEFAULT 'full',
  included_sections JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_shares_code ON campaign_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_campaign_shares_campaign ON campaign_shares(campaign_id);

-- Campaign Shares RLS
ALTER TABLE campaign_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their campaign shares" ON campaign_shares;
CREATE POLICY "Users can manage their campaign shares"
  ON campaign_shares FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view shared campaigns by code" ON campaign_shares;
CREATE POLICY "Anyone can view shared campaigns by code"
  ON campaign_shares FOR SELECT
  USING (
    (expires_at IS NULL OR expires_at > NOW())
  );

-- =====================================================
-- ADD COLUMNS IF TABLES ALREADY EXISTED (safe to run)
-- =====================================================

-- Add columns to character_shares if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_shares' AND column_name = 'last_viewed_at') THEN
    ALTER TABLE character_shares ADD COLUMN last_viewed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_shares' AND column_name = 'note') THEN
    ALTER TABLE character_shares ADD COLUMN note TEXT;
  END IF;
END $$;

-- Add columns to oneshot_shares if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'oneshot_shares' AND column_name = 'last_viewed_at') THEN
    ALTER TABLE oneshot_shares ADD COLUMN last_viewed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'oneshot_shares' AND column_name = 'note') THEN
    ALTER TABLE oneshot_shares ADD COLUMN note TEXT;
  END IF;
END $$;

-- Add columns to campaign_shares if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_shares' AND column_name = 'last_viewed_at') THEN
    ALTER TABLE campaign_shares ADD COLUMN last_viewed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_shares' AND column_name = 'note') THEN
    ALTER TABLE campaign_shares ADD COLUMN note TEXT;
  END IF;
END $$;

COMMENT ON COLUMN character_shares.note IS 'User note about who/why this link was shared';
COMMENT ON COLUMN oneshot_shares.note IS 'User note about who/why this link was shared';
COMMENT ON COLUMN campaign_shares.note IS 'User note about who/why this link was shared';

-- Create share_view_events table for detailed tracking
CREATE TABLE IF NOT EXISTS share_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('character', 'oneshot', 'campaign')),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewer_hash TEXT, -- Hashed identifier for unique visitor tracking (optional)
  referrer TEXT, -- Where the visitor came from (optional)
  user_agent TEXT, -- Browser/device info (optional)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying by share
CREATE INDEX IF NOT EXISTS idx_share_view_events_share
ON share_view_events(share_id, share_type);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_share_view_events_time
ON share_view_events(viewed_at DESC);

-- Index for share_type filtering
CREATE INDEX IF NOT EXISTS idx_share_view_events_type
ON share_view_events(share_type, viewed_at DESC);

-- RLS policies for share_view_events
ALTER TABLE share_view_events ENABLE ROW LEVEL SECURITY;

-- Allow insert from anyone (views are recorded server-side)
CREATE POLICY "Allow insert share view events"
ON share_view_events FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Users can only read view events for their own shares
-- This requires a function to check share ownership
CREATE OR REPLACE FUNCTION is_share_owner(p_share_id UUID, p_share_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_share_type = 'character' THEN
    RETURN EXISTS (
      SELECT 1 FROM character_shares cs
      JOIN vault_characters vc ON cs.character_id = vc.id
      WHERE cs.id = p_share_id AND vc.user_id = auth.uid()
    );
  ELSIF p_share_type = 'oneshot' THEN
    RETURN EXISTS (
      SELECT 1 FROM oneshot_shares os
      JOIN oneshots o ON os.oneshot_id = o.id
      WHERE os.id = p_share_id AND o.user_id = auth.uid()
    );
  ELSIF p_share_type = 'campaign' THEN
    RETURN EXISTS (
      SELECT 1 FROM campaign_shares cs
      JOIN campaigns c ON cs.campaign_id = c.id
      WHERE cs.id = p_share_id AND c.user_id = auth.uid()
    );
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can read their own share view events"
ON share_view_events FOR SELECT
TO authenticated
USING (is_share_owner(share_id, share_type));

-- Comment on table
COMMENT ON TABLE share_view_events IS 'Tracks individual view events for shared content';
COMMENT ON COLUMN share_view_events.viewer_hash IS 'Hashed identifier for unique visitor tracking';
COMMENT ON COLUMN share_view_events.referrer IS 'HTTP referrer showing where visitor came from';
