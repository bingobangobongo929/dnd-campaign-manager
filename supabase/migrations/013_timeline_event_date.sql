-- Add event_date and character_id columns to timeline_events
ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS event_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE SET NULL;

-- Create index for event_date for sorting
CREATE INDEX IF NOT EXISTS idx_timeline_events_event_date ON timeline_events(event_date);
