-- Recent items tracking per user
-- Stores recently accessed items (campaigns, characters, oneshots) for quick access
-- This replaces localStorage storage to ensure proper per-user isolation

CREATE TABLE IF NOT EXISTS recent_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('campaign', 'character', 'oneshot')),
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  item_subtitle TEXT,
  item_image_url TEXT,
  accessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure no duplicate entries per user/item
  UNIQUE(user_id, item_type, item_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_recent_items_user_id ON recent_items(user_id);

-- Index for sorting by access time
CREATE INDEX IF NOT EXISTS idx_recent_items_accessed_at ON recent_items(user_id, accessed_at DESC);

-- RLS policies
ALTER TABLE recent_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recent items
CREATE POLICY "Users can view own recent items"
  ON recent_items FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own recent items
CREATE POLICY "Users can insert own recent items"
  ON recent_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own recent items (for updating accessed_at)
CREATE POLICY "Users can update own recent items"
  ON recent_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own recent items
CREATE POLICY "Users can delete own recent items"
  ON recent_items FOR DELETE
  USING (auth.uid() = user_id);

-- Function to limit recent items per user to 10 (auto-cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_recent_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete items beyond the 10 most recent for this user
  DELETE FROM recent_items
  WHERE id IN (
    SELECT id FROM recent_items
    WHERE user_id = NEW.user_id
    ORDER BY accessed_at DESC
    OFFSET 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-cleanup on insert
DROP TRIGGER IF EXISTS trigger_cleanup_recent_items ON recent_items;
CREATE TRIGGER trigger_cleanup_recent_items
  AFTER INSERT ON recent_items
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_recent_items();
