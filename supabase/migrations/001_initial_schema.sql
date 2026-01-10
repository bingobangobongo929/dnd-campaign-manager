-- Campaign Manager Initial Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  game_system TEXT NOT NULL DEFAULT 'D&D 5e',
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Characters table
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'npc' CHECK (type IN ('pc', 'npc')),
  description TEXT,
  summary TEXT,
  image_url TEXT,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  icon TEXT,
  tag_type TEXT NOT NULL DEFAULT 'categorical' CHECK (tag_type IN ('categorical', 'relational')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Character tags junction table
CREATE TABLE character_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  related_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(character_id, tag_id, related_character_id)
);

-- Canvas groups for organizing characters
CREATE TABLE canvas_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  width FLOAT NOT NULL DEFAULT 400,
  height FLOAT NOT NULL DEFAULT 300,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_number INT NOT NULL,
  title TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, session_number)
);

-- Session characters junction table
CREATE TABLE session_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, character_id)
);

-- Timeline events table
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'other' CHECK (event_type IN ('plot', 'character_intro', 'character_death', 'location', 'combat', 'revelation', 'quest_start', 'quest_end', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  character_ids UUID[],
  event_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- World maps table
CREATE TABLE world_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Media gallery table
CREATE TABLE media_gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Character versions for version history
CREATE TABLE character_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  content_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vault characters (separate from campaigns)
CREATE TABLE vault_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  summary TEXT,
  image_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User settings table
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_provider TEXT NOT NULL DEFAULT 'anthropic' CHECK (ai_provider IN ('anthropic', 'google')),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_characters_campaign_id ON characters(campaign_id);
CREATE INDEX idx_tags_campaign_id ON tags(campaign_id);
CREATE INDEX idx_character_tags_character_id ON character_tags(character_id);
CREATE INDEX idx_character_tags_tag_id ON character_tags(tag_id);
CREATE INDEX idx_canvas_groups_campaign_id ON canvas_groups(campaign_id);
CREATE INDEX idx_sessions_campaign_id ON sessions(campaign_id);
CREATE INDEX idx_session_characters_session_id ON session_characters(session_id);
CREATE INDEX idx_timeline_events_campaign_id ON timeline_events(campaign_id);
CREATE INDEX idx_timeline_events_session_id ON timeline_events(session_id);
CREATE INDEX idx_world_maps_campaign_id ON world_maps(campaign_id);
CREATE INDEX idx_media_gallery_campaign_id ON media_gallery(campaign_id);
CREATE INDEX idx_character_versions_character_id ON character_versions(character_id);
CREATE INDEX idx_vault_characters_user_id ON vault_characters(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Campaigns: users can only access their own campaigns
CREATE POLICY "Users can view their own campaigns" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON campaigns FOR DELETE USING (auth.uid() = user_id);

-- Characters: users can access characters in their campaigns
CREATE POLICY "Users can view characters in their campaigns" ON characters FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = characters.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can insert characters in their campaigns" ON characters FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = characters.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can update characters in their campaigns" ON characters FOR UPDATE USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = characters.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can delete characters in their campaigns" ON characters FOR DELETE USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = characters.campaign_id AND campaigns.user_id = auth.uid())
);

-- Tags: same as characters
CREATE POLICY "Users can view tags in their campaigns" ON tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tags.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can insert tags in their campaigns" ON tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tags.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can update tags in their campaigns" ON tags FOR UPDATE USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tags.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can delete tags in their campaigns" ON tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = tags.campaign_id AND campaigns.user_id = auth.uid())
);

-- Character tags
CREATE POLICY "Users can view character tags" ON character_tags FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM characters
    JOIN campaigns ON campaigns.id = characters.campaign_id
    WHERE characters.id = character_tags.character_id AND campaigns.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert character tags" ON character_tags FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM characters
    JOIN campaigns ON campaigns.id = characters.campaign_id
    WHERE characters.id = character_tags.character_id AND campaigns.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete character tags" ON character_tags FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM characters
    JOIN campaigns ON campaigns.id = characters.campaign_id
    WHERE characters.id = character_tags.character_id AND campaigns.user_id = auth.uid()
  )
);

-- Canvas groups
CREATE POLICY "Users can view canvas groups" ON canvas_groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = canvas_groups.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can insert canvas groups" ON canvas_groups FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = canvas_groups.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can update canvas groups" ON canvas_groups FOR UPDATE USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = canvas_groups.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can delete canvas groups" ON canvas_groups FOR DELETE USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = canvas_groups.campaign_id AND campaigns.user_id = auth.uid())
);

-- Sessions
CREATE POLICY "Users can view sessions" ON sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = sessions.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can insert sessions" ON sessions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = sessions.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can update sessions" ON sessions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = sessions.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can delete sessions" ON sessions FOR DELETE USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = sessions.campaign_id AND campaigns.user_id = auth.uid())
);

-- Session characters
CREATE POLICY "Users can view session characters" ON session_characters FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sessions
    JOIN campaigns ON campaigns.id = sessions.campaign_id
    WHERE sessions.id = session_characters.session_id AND campaigns.user_id = auth.uid()
  )
);
CREATE POLICY "Users can manage session characters" ON session_characters FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sessions
    JOIN campaigns ON campaigns.id = sessions.campaign_id
    WHERE sessions.id = session_characters.session_id AND campaigns.user_id = auth.uid()
  )
);

-- Timeline events
CREATE POLICY "Users can view timeline events" ON timeline_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = timeline_events.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can manage timeline events" ON timeline_events FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = timeline_events.campaign_id AND campaigns.user_id = auth.uid())
);

-- World maps
CREATE POLICY "Users can view world maps" ON world_maps FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = world_maps.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can manage world maps" ON world_maps FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = world_maps.campaign_id AND campaigns.user_id = auth.uid())
);

-- Media gallery
CREATE POLICY "Users can view media" ON media_gallery FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = media_gallery.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users can manage media" ON media_gallery FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = media_gallery.campaign_id AND campaigns.user_id = auth.uid())
);

-- Character versions
CREATE POLICY "Users can view character versions" ON character_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM characters
    JOIN campaigns ON campaigns.id = characters.campaign_id
    WHERE characters.id = character_versions.character_id AND campaigns.user_id = auth.uid()
  )
);
CREATE POLICY "Users can manage character versions" ON character_versions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM characters
    JOIN campaigns ON campaigns.id = characters.campaign_id
    WHERE characters.id = character_versions.character_id AND campaigns.user_id = auth.uid()
  )
);

-- Vault characters: users can only access their own
CREATE POLICY "Users can view their vault characters" ON vault_characters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their vault characters" ON vault_characters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their vault characters" ON vault_characters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their vault characters" ON vault_characters FOR DELETE USING (auth.uid() = user_id);

-- User settings
CREATE POLICY "Users can view their settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_canvas_groups_updated_at BEFORE UPDATE ON canvas_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vault_characters_updated_at BEFORE UPDATE ON vault_characters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default user settings on signup
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create settings on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_settings();
