-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Storage policies for profile photos
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage;
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage;
CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage;
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage;
CREATE POLICY "Users can upload their own profile photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage;
CREATE POLICY "Users can update their own profile photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage;
CREATE POLICY "Users can delete their own profile photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add premium subscription fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_premium BOOLEAN DEFAULT false,
ADD COLUMN premium_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT;

-- Add age range preferences for filtering
ALTER TABLE public.profiles
ADD COLUMN min_age_preference INTEGER DEFAULT 18,
ADD COLUMN max_age_preference INTEGER DEFAULT 100,
ADD COLUMN max_distance_km INTEGER;