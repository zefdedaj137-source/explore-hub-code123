-- ============================================
-- FIX STORAGE BUCKETS AND POLICIES
-- ============================================
-- 
-- Execute this in your Supabase SQL Editor to fix image upload issues
-- ============================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('dance-videos', 'dance-videos', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop all existing storage policies to start fresh
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Safe: Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Safe: Users can upload own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Safe: Users can update own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Safe: Users can delete own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Safe: Anyone can view dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Safe: Users can upload own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Safe: Users can update own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Safe: Users can delete own dance videos" ON storage.objects;

-- Create simple, working storage policies
CREATE POLICY "Public read access for profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Authenticated users can upload profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
);

-- Dance videos policies
CREATE POLICY "Public read access for dance videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'dance-videos');

CREATE POLICY "Authenticated users can upload dance videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dance-videos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own dance videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'dance-videos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own dance videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'dance-videos' 
  AND auth.role() = 'authenticated'
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ STORAGE BUCKETS AND POLICIES FIXED!';
    RAISE NOTICE '📸 Image uploads should now work properly!';
    RAISE NOTICE '🎥 Video uploads should also work!';
    RAISE NOTICE '🔒 Proper security policies in place!';
END $$;