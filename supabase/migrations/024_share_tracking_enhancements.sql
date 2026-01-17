-- Share Tracking Enhancements
-- Adds last_viewed_at and note to character_shares and oneshot_shares
-- Creates share_view_events table for detailed view tracking

-- Add last_viewed_at and note to character_shares
ALTER TABLE character_shares
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS note TEXT;

-- Add last_viewed_at and note to oneshot_shares
ALTER TABLE oneshot_shares
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS note TEXT;

-- Add note to campaign_shares (already has last_viewed_at)
ALTER TABLE campaign_shares
ADD COLUMN IF NOT EXISTS note TEXT;

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
