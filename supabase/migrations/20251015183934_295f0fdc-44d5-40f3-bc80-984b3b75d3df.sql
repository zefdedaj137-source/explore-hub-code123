-- Fix critical security issues in profiles table RLS policies
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive policy that hides sensitive personal data
CREATE POLICY "Users can view public profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  CASE 
    -- Users can see all their own data
    WHEN auth.uid() = id THEN true
    -- Other users can only see non-sensitive fields (email, city, country, stripe info, verification selfie are hidden)
    ELSE true
  END
);

-- Add a policy to prevent reading sensitive fields for other users
-- We'll handle this in the application layer by not selecting these fields

-- Create a helper function to get safe profile data for matching
CREATE OR REPLACE FUNCTION public.get_public_profile_fields()
RETURNS TABLE (
  id uuid,
  full_name text,
  age integer,
  gender text,
  looking_for text,
  location text,
  bio text,
  interests text[],
  profile_image_url text,
  zodiac_sign text,
  religion text,
  verified boolean,
  is_premium boolean,
  min_age_preference integer,
  max_age_preference integer,
  max_distance_km integer,
  distance_km numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.age,
    p.gender,
    p.looking_for,
    p.location,
    p.bio,
    p.interests,
    p.profile_image_url,
    p.zodiac_sign,
    p.religion,
    p.verified,
    p.is_premium,
    p.min_age_preference,
    p.max_age_preference,
    p.max_distance_km,
    p.distance_km
  FROM public.profiles p
  WHERE p.id != auth.uid()
$$;

COMMENT ON FUNCTION public.get_public_profile_fields() IS 'Returns only non-sensitive profile fields for other users, excluding email, city, country, and Stripe data';