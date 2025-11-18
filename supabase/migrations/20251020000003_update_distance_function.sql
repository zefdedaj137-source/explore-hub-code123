-- Drop existing function first
DROP FUNCTION IF EXISTS calculate_distance(double precision, double precision, double precision);

-- Update calculate_distance function to return more profile fields
CREATE OR REPLACE FUNCTION calculate_distance(
  user_lat DOUBLE PRECISION,
  user_long DOUBLE PRECISION,
  max_distance DOUBLE PRECISION DEFAULT 0.1
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  age INTEGER,
  profile_image_url TEXT,
  profile_images TEXT[],
  bio TEXT,
  city TEXT,
  country TEXT,
  work TEXT,
  education TEXT,
  height TEXT,
  zodiac_sign TEXT,
  religion TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  interests TEXT[],
  looking_for TEXT[],
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.age,
    p.profile_image_url,
    p.profile_images,
    p.bio,
    p.city,
    p.country,
    p.work,
    p.education,
    p.height,
    p.zodiac_sign,
    p.religion,
    p.latitude,
    p.longitude,
    p.interests,
    p.looking_for,
    (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(user_long)) + 
        sin(radians(user_lat)) * 
        sin(radians(p.latitude))
      )
    ) AS distance
  FROM profiles p
  WHERE 
    p.latitude IS NOT NULL 
    AND p.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(user_long)) + 
        sin(radians(user_lat)) * 
        sin(radians(p.latitude))
      )
    ) <= max_distance
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql;
