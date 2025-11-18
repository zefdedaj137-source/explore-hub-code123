-- ============================================
-- CRITICAL FIX: Database Commands to Run in Supabase Dashboard
-- ============================================

-- STEP 1: Go to your Supabase dashboard (https://supabase.com/dashboard)
-- STEP 2: Navigate to your project: ojefwfokxsifdxylrwca
-- STEP 3: Go to SQL Editor
-- STEP 4: Run the following commands one by one:

-- Remove the problematic recursive policy
DROP POLICY IF EXISTS "Users can view discoverable profiles" ON public.profiles;

-- Create a simple, non-recursive policy 
CREATE POLICY "Users can view all profiles simple"
ON public.profiles
FOR SELECT
USING (true);

-- Create a function for discovery logic (to be used in application instead of RLS)
CREATE OR REPLACE FUNCTION public.get_discoverable_profiles(
  viewer_id UUID,
  gender_preference TEXT DEFAULT NULL,
  min_age INT DEFAULT 18,
  max_age INT DEFAULT 100,
  excluded_ids UUID[] DEFAULT ARRAY[]::UUID[],
  result_limit INT DEFAULT 200
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
  longitude DOUBLE PRECISION
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
    p.longitude
  FROM public.profiles p
  WHERE p.id != viewer_id
    AND (gender_preference IS NULL OR gender_preference = 'everyone' OR p.gender = gender_preference)
    AND p.age >= min_age
    AND p.age <= max_age
    AND (excluded_ids IS NULL OR NOT (p.id = ANY(excluded_ids)))
  ORDER BY p.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_discoverable_profiles TO authenticated;

-- ============================================
-- STEP 5: After running the above, your app should work without recursion errors
-- ============================================