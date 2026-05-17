-- Fix get_spotlight_profiles to return all profile fields needed for the full profile card

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
  gender TEXT,
  gender_preference TEXT,
  location TEXT,
  city TEXT,
  country TEXT,
  bio TEXT,
  interests TEXT[],
  profile_image_url TEXT,
  profile_images TEXT[],
  video_intro_url TEXT,
  verified BOOLEAN,
  is_premium BOOLEAN,
  zodiac_sign TEXT,
  religion TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  travel_mode_active BOOLEAN,
  travel_city TEXT,
  travel_latitude DOUBLE PRECISION,
  travel_longitude DOUBLE PRECISION,
  work TEXT,
  education TEXT,
  height TEXT,
  height_cm INTEGER,
  looking_for TEXT[],
  lifestyle TEXT,
  drinking TEXT,
  smoking TEXT,
  pets TEXT,
  last_active TIMESTAMPTZ,
  booster_active BOOLEAN,
  booster_expires_at TIMESTAMPTZ,
  mood_emoji TEXT,
  mood_text TEXT,
  soundtrack_title TEXT,
  soundtrack_artist TEXT,
  soundtrack_url TEXT,
  soundtrack_source TEXT,
  distance DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  p_max_distance_km ALIAS FOR max_distance_km;
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.age,
    p.gender,
    p.gender_preference,
    p.location,
    p.city,
    p.country,
    p.bio,
    COALESCE(p.interests, ARRAY[]::TEXT[]) AS interests,
    p.profile_image_url,
    p.profile_images,
    p.video_intro_url,
    p.verified,
    p.is_premium,
    p.zodiac_sign,
    p.religion,
    p.latitude,
    p.longitude,
    p.travel_mode_active,
    p.travel_city,
    p.travel_latitude,
    p.travel_longitude,
    p.work,
    p.education,
    p.height,
    p.height_cm,
    p.looking_for,
    p.lifestyle,
    p.drinking,
    p.smoking,
    p.pets,
    p.last_active,
    p.booster_active,
    p.booster_expires_at,
    p.mood_emoji,
    p.mood_text,
    p.soundtrack_title,
    p.soundtrack_artist,
    p.soundtrack_url,
    p.soundtrack_source,
    CASE 
      WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL 
      THEN calculate_distance(user_latitude, user_longitude, p.latitude, p.longitude)
      ELSE NULL
    END AS distance
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
      calculate_distance(user_latitude, user_longitude, p.latitude, p.longitude) <= p_max_distance_km
    )
  ORDER BY RANDOM()
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_spotlight_profiles(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
