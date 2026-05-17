-- ============================================
-- Security Fix: Profiles Table RLS and PII Exposure
-- ============================================

-- 1. Remove email column (PII exposure issue)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- 2. Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view public profile data" ON public.profiles;

-- 3. Create a restrictive SELECT policy that only shows discoverable profiles
-- Users can only see:
--   - Their own profile (for editing)
--   - Profiles that match their discovery criteria (gender preferences, age, etc.)
DROP POLICY IF EXISTS "Users can view discoverable profiles" ON public;
DROP POLICY IF EXISTS "Users can view discoverable profiles" ON public;
CREATE POLICY "Users can view discoverable profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR (
    -- Profile must match user's gender preference
    gender = (SELECT looking_for FROM public.profiles WHERE id = auth.uid())
    AND
    -- User must match profile's gender preference
    looking_for = (SELECT gender FROM public.profiles WHERE id = auth.uid())
    AND
    -- Profile age must be within user's preferences
    age >= (SELECT min_age_preference FROM public.profiles WHERE id = auth.uid())
    AND
    age <= (SELECT max_age_preference FROM public.profiles WHERE id = auth.uid())
    AND
    -- User age must be within profile's preferences
    (SELECT age FROM public.profiles WHERE id = auth.uid()) >= min_age_preference
    AND
    (SELECT age FROM public.profiles WHERE id = auth.uid()) <= max_age_preference
  )
);

-- 4. Add index to optimize the policy queries
CREATE INDEX IF NOT EXISTS idx_profiles_discovery ON public.profiles(gender, looking_for, age, min_age_preference, max_age_preference);