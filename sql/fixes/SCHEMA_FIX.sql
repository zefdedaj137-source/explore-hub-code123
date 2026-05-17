-- ============================================
-- COMPLETE PROFILES TABLE SCHEMA UPDATE
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/fqmleivxlqqnlokconux
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Execute it to add all missing columns
-- ============================================

-- Add all missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS religion TEXT,
ADD COLUMN IF NOT EXISTS zodiac_sign TEXT,
ADD COLUMN IF NOT EXISTS lifestyle TEXT,
ADD COLUMN IF NOT EXISTS education TEXT,
ADD COLUMN IF NOT EXISTS work TEXT,
ADD COLUMN IF NOT EXISTS height TEXT,
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS body_type TEXT,
ADD COLUMN IF NOT EXISTS smoking TEXT,
ADD COLUMN IF NOT EXISTS drinking TEXT,
ADD COLUMN IF NOT EXISTS kids TEXT,
ADD COLUMN IF NOT EXISTS has_kids TEXT,
ADD COLUMN IF NOT EXISTS wants_kids TEXT,
ADD COLUMN IF NOT EXISTS pets TEXT,
ADD COLUMN IF NOT EXISTS languages TEXT[],
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_selfie_url TEXT,
ADD COLUMN IF NOT EXISTS looking_for TEXT CHECK (looking_for IN ('male', 'female', 'everyone'));

-- Drop existing function and recreate with all fields
DROP FUNCTION IF EXISTS public.get_profiles_for_discovery(uuid,text,integer,integer,uuid[],integer);

-- Create the updated function with all fields
CREATE OR REPLACE FUNCTION public.get_profiles_for_discovery(
  viewer_user_id UUID,
  gender_filter TEXT DEFAULT NULL,
  min_age_filter INTEGER DEFAULT 18,
  max_age_filter INTEGER DEFAULT 100,
  excluded_profile_ids UUID[] DEFAULT ARRAY[]::UUID[],
  result_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  age INTEGER,
  gender TEXT,
  bio TEXT,
  profile_image_url TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  interests TEXT[],
  verified BOOLEAN,
  zodiac_sign TEXT,
  religion TEXT,
  lifestyle TEXT,
  education TEXT,
  work TEXT,
  height TEXT,
  body_type TEXT,
  smoking TEXT,
  drinking TEXT,
  kids TEXT,
  pets TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.age,
    p.gender,
    p.bio,
    p.profile_image_url,
    p.city,
    p.country,
    p.latitude,
    p.longitude,
    p.interests,
    p.verified,
    p.zodiac_sign,
    p.religion,
    p.lifestyle,
    p.education,
    p.work,
    p.height,
    p.body_type,
    p.smoking,
    p.drinking,
    p.kids,
    p.pets
  FROM public.profiles p
  WHERE p.id != viewer_user_id
    AND (gender_filter IS NULL OR gender_filter = 'everyone' OR p.gender = gender_filter)
    AND p.age >= min_age_filter
    AND p.age <= max_age_filter
    AND (excluded_profile_ids IS NULL OR NOT (p.id = ANY(excluded_profile_ids)))
    -- Exclude already liked profiles
    AND NOT EXISTS (
        SELECT 1 FROM public.likes 
        WHERE liker_id = viewer_user_id AND liked_id = p.id
    )
  ORDER BY p.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_profiles_for_discovery TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.religion IS 'Religious preference for compatibility matching';
COMMENT ON COLUMN public.profiles.zodiac_sign IS 'Zodiac sign for compatibility matching';
COMMENT ON COLUMN public.profiles.lifestyle IS 'Lifestyle preferences and habits';
COMMENT ON COLUMN public.profiles.education IS 'Educational background';
COMMENT ON COLUMN public.profiles.work IS 'Professional occupation or work field';
COMMENT ON COLUMN public.profiles.height IS 'Height in text format (e.g., 5''8", 175cm)';
COMMENT ON COLUMN public.profiles.height_cm IS 'Height in centimeters for filtering';
COMMENT ON COLUMN public.profiles.body_type IS 'Physical build description';
COMMENT ON COLUMN public.profiles.smoking IS 'Smoking preference (never, occasionally, regularly, etc.)';
COMMENT ON COLUMN public.profiles.drinking IS 'Alcohol preference (never, socially, regularly, etc.)';
COMMENT ON COLUMN public.profiles.kids IS 'Children status preference';
COMMENT ON COLUMN public.profiles.has_kids IS 'Whether user has children';
COMMENT ON COLUMN public.profiles.wants_kids IS 'Whether user wants children';
COMMENT ON COLUMN public.profiles.pets IS 'Pet ownership and preferences';
COMMENT ON COLUMN public.profiles.languages IS 'Languages spoken';
COMMENT ON COLUMN public.profiles.verified IS 'Account verification status';
COMMENT ON COLUMN public.profiles.verification_selfie_url IS 'URL to verification selfie photo for account verification';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ ALL MISSING COLUMNS ADDED TO PROFILES TABLE!';
    RAISE NOTICE '🎉 Your app should now work without schema errors!';
    RAISE NOTICE '📱 Ready for full profile functionality!';
END $$;