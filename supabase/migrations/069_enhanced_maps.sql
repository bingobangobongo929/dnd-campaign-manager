-- Enhanced Maps: Drawing tools, templates, map linking, and terrain system
-- Migration 069

-- =====================================================
-- 1. MAP DRAWINGS TABLE (for freehand, shapes, text annotations)
-- =====================================================

CREATE TABLE IF NOT EXISTS map_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES world_maps(id) ON DELETE CASCADE,
  drawing_type TEXT NOT NULL CHECK (drawing_type IN ('freehand', 'line', 'rectangle', 'circle', 'polygon', 'text', 'arrow')),
  -- Position and dimensions (all as percentages of map size for scaling)
  points JSONB NOT NULL DEFAULT '[]', -- Array of {x, y} points for paths/polygons
  x FLOAT, -- For shapes/text: center or start x
  y FLOAT, -- For shapes/text: center or start y
  width FLOAT, -- For rectangles
  height FLOAT, -- For rectangles
  radius FLOAT, -- For circles
  -- Styling
  stroke_color TEXT DEFAULT '#ffffff',
  stroke_width FLOAT DEFAULT 2,
  fill_color TEXT, -- null = no fill
  fill_opacity FLOAT DEFAULT 0.3,
  -- Text specific
  text_content TEXT,
  font_size FLOAT DEFAULT 14,
  font_family TEXT DEFAULT 'sans-serif',
  -- Metadata
  layer_index INTEGER DEFAULT 0, -- For z-ordering
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('dm_only', 'party', 'public')),
  locked BOOLEAN DEFAULT false, -- Prevent accidental edits
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_drawings_map ON map_drawings(map_id);
CREATE INDEX IF NOT EXISTS idx_map_drawings_layer ON map_drawings(map_id, layer_index);

-- =====================================================
-- 2. MAP TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS map_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('world', 'region', 'city', 'dungeon', 'building', 'encounter', 'custom')),
  -- Template content
  thumbnail_url TEXT, -- Preview image
  template_data JSONB NOT NULL DEFAULT '{}', -- Contains grid settings, default layers, preset pins, etc.
  -- For user-created templates
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_system BOOLEAN DEFAULT false, -- System templates vs user-created
  is_public BOOLEAN DEFAULT false, -- Share with community
  -- Metadata
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_templates_category ON map_templates(category);
CREATE INDEX IF NOT EXISTS idx_map_templates_user ON map_templates(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_templates_public ON map_templates(is_public) WHERE is_public = true;

-- =====================================================
-- 3. ENHANCE WORLD_MAPS TABLE
-- =====================================================

-- Add parent map for nested/linked maps
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS parent_map_id UUID REFERENCES world_maps(id) ON DELETE SET NULL;

-- Add description for maps
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS description TEXT;

-- Add map type/category
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS map_type TEXT DEFAULT 'world' CHECK (map_type IN ('world', 'region', 'city', 'dungeon', 'building', 'encounter', 'sketch'));

-- Add grid settings
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS grid_enabled BOOLEAN DEFAULT false;
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS grid_size INTEGER DEFAULT 50; -- pixels
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS grid_color TEXT DEFAULT 'rgba(255,255,255,0.1)';

-- Add scale for distance measurement
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS scale_unit TEXT DEFAULT 'miles'; -- miles, km, feet, meters
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS scale_value FLOAT; -- e.g., 1 inch = 10 miles

-- Add template reference (if created from template)
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES map_templates(id) ON DELETE SET NULL;

-- Add terrain layer data (for build mode)
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS terrain_data JSONB DEFAULT '{}';

-- Add stamp placements
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS stamps JSONB DEFAULT '[]';

-- Index for nested maps
CREATE INDEX IF NOT EXISTS idx_world_maps_parent ON world_maps(parent_map_id) WHERE parent_map_id IS NOT NULL;

-- =====================================================
-- 4. MAP STAMPS/ASSETS TABLE (system-provided assets)
-- =====================================================

CREATE TABLE IF NOT EXISTS map_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('terrain', 'building', 'nature', 'icon', 'decoration', 'people', 'creature', 'effect')),
  subcategory TEXT, -- e.g., 'castle', 'tree', 'mountain'
  -- Asset data
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  svg_data TEXT, -- For vector assets
  -- Dimensions
  default_width FLOAT DEFAULT 50,
  default_height FLOAT DEFAULT 50,
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  pack_name TEXT, -- Which asset pack it belongs to
  is_premium BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_assets_category ON map_assets(category);
CREATE INDEX IF NOT EXISTS idx_map_assets_pack ON map_assets(pack_name);
CREATE INDEX IF NOT EXISTS idx_map_assets_tags ON map_assets USING gin(tags);

-- =====================================================
-- 5. PIN ENHANCEMENTS
-- =====================================================

-- Add linked_map_id for pins that link to sub-maps
ALTER TABLE map_pins ADD COLUMN IF NOT EXISTS linked_map_id UUID REFERENCES world_maps(id) ON DELETE SET NULL;

-- Add shape options for pins (not just markers)
ALTER TABLE map_pins ADD COLUMN IF NOT EXISTS pin_shape TEXT DEFAULT 'marker' CHECK (pin_shape IN ('marker', 'circle', 'square', 'diamond', 'star', 'flag', 'custom'));

-- Add size option
ALTER TABLE map_pins ADD COLUMN IF NOT EXISTS pin_size TEXT DEFAULT 'medium' CHECK (pin_size IN ('small', 'medium', 'large'));

-- Add custom icon URL
ALTER TABLE map_pins ADD COLUMN IF NOT EXISTS custom_icon_url TEXT;

-- Index for linked maps
CREATE INDEX IF NOT EXISTS idx_map_pins_linked_map ON map_pins(linked_map_id) WHERE linked_map_id IS NOT NULL;

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

-- Map Drawings RLS
ALTER TABLE map_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drawings for their campaign maps"
ON map_drawings FOR SELECT
USING (
  map_id IN (
    SELECT wm.id FROM world_maps wm
    JOIN campaigns c ON wm.campaign_id = c.id
    WHERE c.user_id = auth.uid()
    OR c.id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Campaign owners and DMs can manage drawings"
ON map_drawings FOR ALL
USING (
  map_id IN (
    SELECT wm.id FROM world_maps wm
    JOIN campaigns c ON wm.campaign_id = c.id
    WHERE c.user_id = auth.uid()
    OR c.id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role IN ('owner', 'co_dm'))
  )
);

-- Map Templates RLS
ALTER TABLE map_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system and public templates"
ON map_templates FOR SELECT
USING (is_system = true OR is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can manage their own templates"
ON map_templates FOR ALL
USING (user_id = auth.uid() OR is_system = false);

-- Map Assets RLS (read-only for all authenticated users)
ALTER TABLE map_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view map assets"
ON map_assets FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 7. UPDATE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_map_drawings_updated_at ON map_drawings;
CREATE TRIGGER update_map_drawings_updated_at
  BEFORE UPDATE ON map_drawings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_map_templates_updated_at ON map_templates;
CREATE TRIGGER update_map_templates_updated_at
  BEFORE UPDATE ON map_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. SEED DEFAULT MAP TEMPLATES
-- =====================================================

INSERT INTO map_templates (name, description, category, is_system, template_data) VALUES
('Blank World Map', 'Start with a blank canvas for your world', 'world', true, '{"grid": false, "background": "#1a1a2e"}'),
('Blank Regional Map', 'A blank template for regional maps', 'region', true, '{"grid": false, "background": "#2d3436"}'),
('Dungeon Grid', 'A grid-based dungeon template', 'dungeon', true, '{"grid": true, "gridSize": 50, "background": "#1e1e1e"}'),
('City Districts', 'Template for city maps with district zones', 'city', true, '{"grid": false, "background": "#2c3e50"}'),
('Tavern Floor Plan', 'Common tavern layout template', 'building', true, '{"grid": true, "gridSize": 40, "background": "#3e2723"}'),
('Forest Clearing', 'Encounter map in a forest clearing', 'encounter', true, '{"grid": true, "gridSize": 50, "background": "#1b4332"}'),
('Cave System', 'Underground cave network template', 'dungeon', true, '{"grid": true, "gridSize": 50, "background": "#1a1a1a"}'),
('Quick Sketch', 'Minimal template for improvised maps', 'custom', true, '{"grid": false, "background": "#f5f0e1"}')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON TABLE map_drawings IS 'Freehand drawings, shapes, and text annotations on maps';
COMMENT ON TABLE map_templates IS 'Pre-built map templates for quick start';
COMMENT ON TABLE map_assets IS 'System-provided stamps and assets for map building';
COMMENT ON COLUMN world_maps.parent_map_id IS 'Links to parent map for nested/drill-down navigation';
COMMENT ON COLUMN world_maps.terrain_data IS 'Painted terrain regions for build mode';
COMMENT ON COLUMN world_maps.stamps IS 'Placed stamp/asset instances on the map';
COMMENT ON COLUMN map_pins.linked_map_id IS 'Pin that opens a sub-map when clicked';
