-- Character Image Storage Migration
-- Run this in your Supabase SQL editor after the initial schema

-- ============================================
-- 1. Add new columns to characters table
-- ============================================

-- Add detail_image_url for the 2:3 portrait crop
ALTER TABLE characters ADD COLUMN IF NOT EXISTS detail_image_url TEXT;

-- Add flag to track if image was AI generated
ALTER TABLE characters ADD COLUMN IF NOT EXISTS image_generated_with_ai BOOLEAN DEFAULT FALSE;

-- Add canvas_width and canvas_height if they don't exist (they should from earlier)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS canvas_width INTEGER;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS canvas_height INTEGER;

-- Add notes column if it doesn't exist
ALTER TABLE characters ADD COLUMN IF NOT EXISTS notes TEXT;

-- Also add to vault_characters for consistency
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS detail_image_url TEXT;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS image_generated_with_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'npc' CHECK (type IN ('pc', 'npc'));
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 2. Create Storage Bucket
-- ============================================

-- Note: Storage bucket creation is typically done via the Supabase dashboard
-- or using the Supabase CLI. The SQL below documents what needs to be created.

-- In the Supabase Dashboard:
-- 1. Go to Storage
-- 2. Create a new bucket called "character-images"
-- 3. Make it PUBLIC (so images can be viewed)
-- 4. Set file size limit to 10MB
-- 5. Allow mime types: image/jpeg, image/png, image/webp

-- ============================================
-- 3. Storage RLS Policies
-- ============================================

-- These policies need to be run AFTER creating the bucket in the dashboard.
-- Uncomment and run once the bucket exists.

/*
-- Allow authenticated users to upload images
CREATE POLICY "Users can upload character images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'character-images'
  AND auth.role() = 'authenticated'
);

-- Allow public read access to all character images
CREATE POLICY "Public can view character images"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-images');

-- Allow users to update their own uploaded images
CREATE POLICY "Users can update their character images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'character-images'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete their character images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'character-images'
  AND auth.role() = 'authenticated'
);
*/

-- ============================================
-- Instructions for Ed:
-- ============================================
-- 1. Run this SQL file in the Supabase SQL editor
-- 2. Go to Storage in the Supabase Dashboard
-- 3. Click "New Bucket"
-- 4. Name: character-images
-- 5. Toggle "Public bucket" ON
-- 6. Click "Create bucket"
-- 7. Return to SQL editor and run the storage policies (uncomment them above)
-- ============================================
