-- Migration: Waitlist Table
-- Stores early access requests from the landing page

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_at TIMESTAMPTZ,
  notes TEXT
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_invited_at ON waitlist(invited_at);

-- RLS policies
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Only admins can read waitlist
CREATE POLICY "Admins can read waitlist"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

-- Anyone can insert (public signup)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can update (mark as invited)
CREATE POLICY "Admins can update waitlist"
  ON waitlist
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'moderator')
    )
  );

COMMENT ON TABLE waitlist IS 'Early access requests from the landing page waitlist form';
