-- Create or replace the get_spotlight_profiles function
-- This function retrieves profiles for the spotlight/boost feature

-- Drop existing function first to avoid return type conflicts
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
  distance DOUBLE PRECISION,
  gender TEXT,
  gender_preference TEXT
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
    p.bio,
    p.profile_image_url,
    p.profile_images,
    p.latitude,
    p.longitude,
    CASE 
      WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL 
      THEN calculate_distance(user_latitude, user_longitude, p.latitude, p.longitude)
      ELSE NULL
    END as distance,
    p.gender,
    p.gender_preference
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
  ORDER BY 
    RANDOM()
  LIMIT 50;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_spotlight_profiles(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;

-- Create calculate_distance helper function if it doesn't exist
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  earth_radius CONSTANT DOUBLE PRECISION := 6371; -- Earth's radius in kilometers
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  -- Haversine formula to calculate distance between two points
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$;

-- Grant execute permissions for the distance calculation function
GRANT EXECUTE ON FUNCTION calculate_distance(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
