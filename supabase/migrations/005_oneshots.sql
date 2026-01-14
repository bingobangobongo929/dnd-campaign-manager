-- One-shots feature tables
-- Migration: 005_oneshots.sql

-- Genre tags for one-shots (user-customizable)
CREATE TABLE IF NOT EXISTS oneshot_genre_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main one-shots table
CREATE TABLE IF NOT EXISTS oneshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  tagline TEXT,
  image_url TEXT,

  -- Genre tags (array of tag IDs)
  genre_tag_ids UUID[] DEFAULT '{}',

  -- Game info
  game_system TEXT DEFAULT 'D&D 5e',
  level INTEGER,
  player_count_min INTEGER DEFAULT 3,
  player_count_max INTEGER DEFAULT 5,
  estimated_duration TEXT,

  -- Content sections (rich text)
  introduction TEXT,
  setting_notes TEXT,
  character_creation TEXT,
  session_plan TEXT,
  twists TEXT,
  key_npcs TEXT,
  handouts TEXT,

  -- Status
  status TEXT DEFAULT 'draft',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One-shot run history (when she runs it with a group)
CREATE TABLE IF NOT EXISTS oneshot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oneshot_id UUID NOT NULL REFERENCES oneshots(id) ON DELETE CASCADE,

  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  group_name TEXT,
  player_count INTEGER,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One-shot shares (for sharing read-only versions)
CREATE TABLE IF NOT EXISTS oneshot_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT NOT NULL UNIQUE,
  oneshot_id UUID NOT NULL REFERENCES oneshots(id) ON DELETE CASCADE,

  included_sections JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE oneshot_genre_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE oneshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE oneshot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oneshot_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for genre tags
CREATE POLICY "Users can view own genre tags" ON oneshot_genre_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own genre tags" ON oneshot_genre_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own genre tags" ON oneshot_genre_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own genre tags" ON oneshot_genre_tags
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for oneshots
CREATE POLICY "Users can view own oneshots" ON oneshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own oneshots" ON oneshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own oneshots" ON oneshots
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own oneshots" ON oneshots
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for oneshot runs
CREATE POLICY "Users can view runs of own oneshots" ON oneshot_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM oneshots WHERE oneshots.id = oneshot_runs.oneshot_id AND oneshots.user_id = auth.uid())
  );

CREATE POLICY "Users can insert runs for own oneshots" ON oneshot_runs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM oneshots WHERE oneshots.id = oneshot_runs.oneshot_id AND oneshots.user_id = auth.uid())
  );

CREATE POLICY "Users can update runs of own oneshots" ON oneshot_runs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM oneshots WHERE oneshots.id = oneshot_runs.oneshot_id AND oneshots.user_id = auth.uid())
  );

CREATE POLICY "Users can delete runs of own oneshots" ON oneshot_runs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM oneshots WHERE oneshots.id = oneshot_runs.oneshot_id AND oneshots.user_id = auth.uid())
  );

-- RLS Policies for oneshot shares
CREATE POLICY "Users can view shares of own oneshots" ON oneshot_shares
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM oneshots WHERE oneshots.id = oneshot_shares.oneshot_id AND oneshots.user_id = auth.uid())
  );

CREATE POLICY "Users can insert shares for own oneshots" ON oneshot_shares
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM oneshots WHERE oneshots.id = oneshot_shares.oneshot_id AND oneshots.user_id = auth.uid())
  );

CREATE POLICY "Users can update shares of own oneshots" ON oneshot_shares
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM oneshots WHERE oneshots.id = oneshot_shares.oneshot_id AND oneshots.user_id = auth.uid())
  );

CREATE POLICY "Users can delete shares of own oneshots" ON oneshot_shares
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM oneshots WHERE oneshots.id = oneshot_shares.oneshot_id AND oneshots.user_id = auth.uid())
  );

-- Public can view shared oneshots (for share links)
CREATE POLICY "Anyone can view shared oneshots" ON oneshot_shares
  FOR SELECT USING (true);

-- Create updated_at trigger for oneshots
CREATE OR REPLACE FUNCTION update_oneshot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER oneshots_updated_at
  BEFORE UPDATE ON oneshots
  FOR EACH ROW
  EXECUTE FUNCTION update_oneshot_updated_at();

-- Insert default genre tags for existing users
-- (This will be done via the app when users first access the feature)

-- Create storage bucket for oneshot images
INSERT INTO storage.buckets (id, name, public)
VALUES ('oneshot-images', 'oneshot-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for oneshot images
CREATE POLICY "Users can upload oneshot images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'oneshot-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own oneshot images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'oneshot-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete own oneshot images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'oneshot-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view oneshot images" ON storage.objects
  FOR SELECT USING (bucket_id = 'oneshot-images');
