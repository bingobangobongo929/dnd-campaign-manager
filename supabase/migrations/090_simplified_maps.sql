-- Migration 090: Simplified Maps with expanded types
-- Adds new map types and custom type support

-- Drop the old constraint if it exists
ALTER TABLE world_maps DROP CONSTRAINT IF EXISTS world_maps_map_type_check;

-- Add new map_type values and allow custom
ALTER TABLE world_maps
  ALTER COLUMN map_type TYPE TEXT,
  ADD CONSTRAINT world_maps_map_type_check CHECK (
    map_type IN ('world', 'region', 'city', 'settlement', 'fortress', 'dungeon',
                 'interior', 'wilderness', 'vehicle', 'plane', 'building',
                 'encounter', 'sketch', 'custom')
  );

-- Add custom type fields
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS custom_type TEXT;
ALTER TABLE world_maps ADD COLUMN IF NOT EXISTS custom_emoji TEXT DEFAULT '📍';

-- Update existing 'city' types to 'settlement' for consistency
UPDATE world_maps SET map_type = 'settlement' WHERE map_type = 'city';

-- Update existing 'building' types to 'interior' for consistency
UPDATE world_maps SET map_type = 'interior' WHERE map_type = 'building';

-- Comment
COMMENT ON COLUMN world_maps.custom_type IS 'User-defined map type label when map_type is custom';
COMMENT ON COLUMN world_maps.custom_emoji IS 'User-defined emoji for custom map type';
