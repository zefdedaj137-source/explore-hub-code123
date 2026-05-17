-- Fix get_spotlight_profiles to only return profiles with an active booster.
-- The previous migration (20251119000004) accidentally removed the booster filter,
-- causing all profiles to appear in the "Last Active" tab.

DROP FUNCTION IF EXISTS get_spotlight_profiles(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION get_spotlight_profiles(
  current_user_id UUID,
  user_latitude DOUBLE PRECISION,
  user_longitude DOUBLE PRECISION,
  max_distance_km INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  age INTEGER,
  bio TEXT,
  profile_image_url TEXT,
  profile_images TEXT[],
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  travel_mode_active BOOLEAN,
  travel_latitude NUMERIC,
  travel_longitude NUMERIC,
  distance DOUBLE PRECISION,
  gender TEXT,
  gender_preference TEXT,
  city TEXT,
  interests TEXT[],
  verified BOOLEAN,
  booster_active BOOLEAN,
  booster_expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  p_max_distance_km ALIAS FOR max_distance_km;
BEGIN
  -- Expire any boosters that have lapsed (qualify columns to avoid ambiguity with RETURNS TABLE names)
  UPDATE profiles AS exp
  SET booster_active = FALSE
  WHERE exp.booster_active = TRUE
    AND exp.booster_expires_at <= NOW();

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.age,
    p.bio,
    p.profile_image_url,
    p.profile_images,
    p.latitude,
    p.longitude,
    p.travel_mode_active,
    p.travel_latitude,
    p.travel_longitude,
    CASE
      WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      THEN calculate_distance(user_latitude, user_longitude, p.latitude, p.longitude)::DOUBLE PRECISION
      ELSE NULL::DOUBLE PRECISION
    END AS distance,
    p.gender,
    p.gender_preference,
    p.city,
    p.interests,
    p.verified,
    p.booster_active,
    p.booster_expires_at
  FROM profiles p
  WHERE
    p.id != current_user_id
    -- Only boosted profiles
    AND p.booster_active = TRUE
    AND p.booster_expires_at > NOW()
    -- Exclude existing matches
    AND p.id NOT IN (
      SELECT CASE WHEN user1_id = current_user_id THEN user2_id ELSE user1_id END
      FROM matches
      WHERE user1_id = current_user_id OR user2_id = current_user_id
    )
    -- Exclude already liked/passed profiles
    AND p.id NOT IN (
      SELECT liked_id FROM likes WHERE liker_id = current_user_id
    )
    AND p.full_name IS NOT NULL
    AND p.age IS NOT NULL
    AND (
      p.latitude IS NULL OR p.longitude IS NULL OR
      calculate_distance(user_latitude, user_longitude, p.latitude, p.longitude) <= p_max_distance_km
    )
  ORDER BY p.booster_expires_at ASC  -- show those expiring soonest first
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_spotlight_profiles(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
