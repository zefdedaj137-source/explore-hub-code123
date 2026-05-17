-- Fix get_spotlight_profiles to use RETURNS SETOF profiles so it always matches
-- the actual table columns, regardless of when new columns were added.

DROP FUNCTION IF EXISTS get_spotlight_profiles(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION get_spotlight_profiles(
  current_user_id UUID,
  user_latitude DOUBLE PRECISION,
  user_longitude DOUBLE PRECISION,
  max_distance_km INTEGER DEFAULT 100
)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM profiles p
  WHERE
    p.id != current_user_id
    AND p.id NOT IN (
      SELECT CASE WHEN user1_id = current_user_id THEN user2_id ELSE user1_id END
      FROM matches
      WHERE user1_id = current_user_id OR user2_id = current_user_id
    )
    AND p.id NOT IN (
      SELECT liked_id FROM likes WHERE liker_id = current_user_id
    )
    AND p.full_name IS NOT NULL
    AND p.age IS NOT NULL
    AND (
      p.latitude IS NULL OR p.longitude IS NULL OR
      calculate_distance(user_latitude, user_longitude, p.latitude, p.longitude) <= max_distance_km
    )
  ORDER BY RANDOM()
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_spotlight_profiles(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
