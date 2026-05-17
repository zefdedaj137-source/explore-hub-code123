-- Migration: Add missing indexes for discovery performance
-- These indexes complement the new get_discover_profiles RPC.
-- Without them Postgres will do full-table scans on every discover call.

-- Partial index: active (non-deactivated) profiles — used in almost every query
CREATE INDEX IF NOT EXISTS idx_profiles_active
  ON public.profiles (id)
  WHERE deactivated_at IS NULL;

-- Partial index: active non-incognito profiles (core discovery filter)
CREATE INDEX IF NOT EXISTS idx_profiles_discoverable
  ON public.profiles (last_active DESC NULLS LAST)
  WHERE deactivated_at IS NULL
    AND (incognito_mode IS NULL OR incognito_mode = FALSE);

-- Age + gender — used in every discovery age-range query
CREATE INDEX IF NOT EXISTS idx_profiles_age_gender
  ON public.profiles (age, gender)
  WHERE deactivated_at IS NULL;

-- Spatial: lat/lon for distance calculations (dedup of older idx_profiles_location)
-- Already exists as idx_profiles_location and idx_profiles_coordinates from prior
-- migrations, so this is a no-op guard only.
CREATE INDEX IF NOT EXISTS idx_profiles_latlon
  ON public.profiles (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Likes: fast anti-join lookup (liker_id, liked_id) — covers NOT EXISTS subquery
CREATE INDEX IF NOT EXISTS idx_likes_liker_liked
  ON public.likes (liker_id, liked_id);

-- Matches: fast anti-join lookup for both sides
CREATE INDEX IF NOT EXISTS idx_matches_user1_user2
  ON public.matches (user1_id, user2_id);

CREATE INDEX IF NOT EXISTS idx_matches_user2_user1
  ON public.matches (user2_id, user1_id);
