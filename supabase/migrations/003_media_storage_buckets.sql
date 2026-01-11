-- Media Storage Buckets Migration
-- Run this in your Supabase SQL editor

-- ============================================
-- Instructions:
-- 1. Go to Storage in the Supabase Dashboard
-- 2. Create two new PUBLIC buckets:
--    - "world-maps" (for campaign maps)
--    - "media-gallery" (for general images)
-- 3. Then run the policies below
-- ============================================

-- ============================================
-- World Maps Bucket Policies
-- ============================================

-- Allow authenticated users to upload world maps
CREATE POLICY "Users can upload world maps"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'world-maps'
  AND auth.role() = 'authenticated'
);

-- Allow public read access to all world maps
CREATE POLICY "Public can view world maps"
ON storage.objects FOR SELECT
USING (bucket_id = 'world-maps');

-- Allow users to delete their world maps
CREATE POLICY "Users can delete world maps"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'world-maps'
  AND auth.role() = 'authenticated'
);

-- ============================================
-- Media Gallery Bucket Policies
-- ============================================

-- Allow authenticated users to upload gallery images
CREATE POLICY "Users can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media-gallery'
  AND auth.role() = 'authenticated'
);

-- Allow public read access to all gallery images
CREATE POLICY "Public can view gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-gallery');

-- Allow users to delete their gallery images
CREATE POLICY "Users can delete gallery images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media-gallery'
  AND auth.role() = 'authenticated'
);

-- ============================================
-- Bucket Creation Instructions:
-- ============================================
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New Bucket"
-- 3. Name: world-maps
--    - Toggle "Public bucket" ON
--    - File size limit: 20MB
--    - Click "Create bucket"
-- 4. Repeat for media-gallery
--    - Name: media-gallery
--    - Toggle "Public bucket" ON
--    - File size limit: 10MB
--    - Click "Create bucket"
-- 5. Run the SQL policies above
-- ============================================
