-- Add location and importance fields to timeline_events
ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS is_major BOOLEAN DEFAULT false;

-- Create index for filtering by importance
CREATE INDEX IF NOT EXISTS idx_timeline_events_is_major ON timeline_events(is_major);
