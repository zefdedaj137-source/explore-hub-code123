-- Migration: Enforce incognito_mode at the RLS layer
-- Without this, direct table queries (e.g. from Matches, WhoLikedYou) can still
-- return incognito profiles. The get_discover_profiles RPC already filters them
-- in SQL, but this policy ensures no code path can accidentally expose them.

-- Ensure RLS is on (may already be set, safe to re-run)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop the old public select policy if it exists so we can replace it
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_viewable_by_all" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- New select policy: authenticated users can see profiles that are:
--   1. Their OWN profile (always visible regardless of incognito), OR
--   2. Not incognito AND not deactivated
CREATE POLICY "profiles_select_policy"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Always allow users to see their own profile
    id = auth.uid()
    OR (
      (incognito_mode IS NULL OR incognito_mode = FALSE)
      AND deactivated_at IS NULL
    )
  );

-- Ensure users can still update their own profile
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;

CREATE POLICY "users_update_own_profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Ensure users can insert their own profile (needed for onboarding)
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;

CREATE POLICY "users_insert_own_profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
