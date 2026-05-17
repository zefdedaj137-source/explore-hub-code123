-- ============================================
-- Fix: Remove recursive profiles policy that causes infinite recursion
-- ============================================

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view discoverable profiles" ON public.profiles;

-- Create a simple, non-recursive policy for viewing profiles
-- This allows users to view all profiles except for sensitive operations
DROP POLICY IF EXISTS "Users can view all profiles" ON public;
DROP POLICY IF EXISTS "Users can view all profiles" ON public;
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
USING (true);

-- Keep the existing INSERT and UPDATE policies as they're fine
-- CREATE POLICY "Users can insert their own profile" (already exists)
-- CREATE POLICY "Users can update their own profile" (already exists)

-- Add a function to check discovery preferences without recursion
-- This function will be used by the application logic instead of database policies
CREATE OR REPLACE FUNCTION public.is_profile_discoverable(
  target_profile_id UUID,
  viewer_profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_profile RECORD;
  viewer_profile RECORD;
BEGIN
  -- Get both profiles in one query to avoid recursion
  SELECT 
    tp.gender as target_gender,
    tp.looking_for as target_looking_for,
    tp.age as target_age,
    tp.min_age_preference as target_min_age,
    tp.max_age_preference as target_max_age,
    vp.gender as viewer_gender,
    vp.looking_for as viewer_looking_for,
    vp.age as viewer_age,
    vp.min_age_preference as viewer_min_age,
    vp.max_age_preference as viewer_max_age
  INTO target_profile, viewer_profile
  FROM public.profiles tp, public.profiles vp
  WHERE tp.id = target_profile_id 
    AND vp.id = viewer_profile_id;
  
  -- If either profile doesn't exist, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if profiles are compatible
  RETURN (
    -- Target profile's gender matches viewer's preference
    (viewer_profile.viewer_looking_for = 'everyone' OR 
     target_profile.target_gender = viewer_profile.viewer_looking_for) AND
    
    -- Viewer's gender matches target's preference  
    (target_profile.target_looking_for = 'everyone' OR
     viewer_profile.viewer_gender = target_profile.target_looking_for) AND
    
    -- Age compatibility
    (target_profile.target_age >= viewer_profile.viewer_min_age) AND
    (target_profile.target_age <= viewer_profile.viewer_max_age) AND
    (viewer_profile.viewer_age >= target_profile.target_min_age) AND
    (viewer_profile.viewer_age <= target_profile.target_max_age)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_profile_discoverable TO authenticated;