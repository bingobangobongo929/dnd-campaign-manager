-- Changelog table for public release notes
-- Managed by admins through the admin panel

CREATE TABLE IF NOT EXISTS changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT now(),
  is_major BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fetching entries in order
CREATE INDEX IF NOT EXISTS idx_changelog_published_at ON changelog(published_at DESC);

-- RLS policies
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;

-- Anyone can read published changelog entries (public page)
CREATE POLICY "Changelog is publicly readable"
  ON changelog FOR SELECT
  USING (published_at <= now());

-- Only super_admins can insert/update/delete (handled by admin API with service role)
-- No direct user policies for write operations - all writes go through admin API
