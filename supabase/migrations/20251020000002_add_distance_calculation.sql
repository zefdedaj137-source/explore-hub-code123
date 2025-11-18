-- Add location columns to profiles if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);

-- Function to calculate distance between two points using Haversine formula
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
  bio TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  interests TEXT[],
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.age,
    p.profile_image_url,
    p.bio,
    p.latitude,
    p.longitude,
    p.interests,
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
