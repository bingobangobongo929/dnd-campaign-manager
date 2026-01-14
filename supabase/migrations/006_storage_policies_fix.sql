-- Storage Buckets and Policies Fix
-- Migration: 006_storage_policies_fix.sql
-- This migration ensures all storage buckets exist and have proper RLS policies

-- ============================================
-- CREATE BUCKETS (if they don't exist)
-- ============================================

-- Character images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('character-images', 'character-images', true)
ON CONFLICT (id) DO NOTHING;

-- Vault images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-images', 'vault-images', true)
ON CONFLICT (id) DO NOTHING;

-- Campaign images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO NOTHING;

-- World maps bucket (in case it wasn't created)
INSERT INTO storage.buckets (id, name, public)
VALUES ('world-maps', 'world-maps', true)
ON CONFLICT (id) DO NOTHING;

-- Media gallery bucket (in case it wasn't created)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-gallery', 'media-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CHARACTER IMAGES POLICIES
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload character images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view character images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their character images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their character images" ON storage.objects;

CREATE POLICY "Users can upload character images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'character-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Public can view character images"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-images');

CREATE POLICY "Users can update their character images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'character-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their character images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'character-images'
  AND auth.uid() IS NOT NULL
);

-- ============================================
-- VAULT IMAGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can upload vault images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view vault images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update vault images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vault images" ON storage.objects;

CREATE POLICY "Users can upload vault images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vault-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Public can view vault images"
ON storage.objects FOR SELECT
USING (bucket_id = 'vault-images');

CREATE POLICY "Users can update vault images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'vault-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete vault images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vault-images'
  AND auth.uid() IS NOT NULL
);

-- ============================================
-- CAMPAIGN IMAGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can upload campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete campaign images" ON storage.objects;

CREATE POLICY "Users can upload campaign images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Public can view campaign images"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-images');

CREATE POLICY "Users can update campaign images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete campaign images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-images'
  AND auth.uid() IS NOT NULL
);

-- ============================================
-- WORLD MAPS POLICIES (fix if needed)
-- ============================================

DROP POLICY IF EXISTS "Users can upload world maps" ON storage.objects;
DROP POLICY IF EXISTS "Public can view world maps" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete world maps" ON storage.objects;

CREATE POLICY "Users can upload world maps"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'world-maps'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Public can view world maps"
ON storage.objects FOR SELECT
USING (bucket_id = 'world-maps');

CREATE POLICY "Users can delete world maps"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'world-maps'
  AND auth.uid() IS NOT NULL
);

-- ============================================
-- MEDIA GALLERY POLICIES (fix if needed)
-- ============================================

DROP POLICY IF EXISTS "Users can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete gallery images" ON storage.objects;

CREATE POLICY "Users can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media-gallery'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Public can view gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-gallery');

CREATE POLICY "Users can delete gallery images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media-gallery'
  AND auth.uid() IS NOT NULL
);
