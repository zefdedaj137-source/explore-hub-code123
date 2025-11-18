-- Add Travel Mode feature for premium users
-- This allows premium users to change their location temporarily to explore matches in different cities

-- Add travel mode columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS travel_mode_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS travel_location TEXT,
ADD COLUMN IF NOT EXISTS travel_city TEXT,
ADD COLUMN IF NOT EXISTS travel_country TEXT,
ADD COLUMN IF NOT EXISTS travel_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS travel_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS travel_mode_expires_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN profiles.travel_mode_active IS 'Whether user has travel mode enabled (premium feature)';
COMMENT ON COLUMN profiles.travel_location IS 'Full travel location string';
COMMENT ON COLUMN profiles.travel_city IS 'City name when in travel mode';
COMMENT ON COLUMN profiles.travel_country IS 'Country when in travel mode';
COMMENT ON COLUMN profiles.travel_latitude IS 'Latitude of travel location';
COMMENT ON COLUMN profiles.travel_longitude IS 'Longitude of travel location';
COMMENT ON COLUMN profiles.travel_mode_expires_at IS 'When travel mode expires (optional time limit)';

-- Function to activate travel mode (premium only)
CREATE OR REPLACE FUNCTION activate_travel_mode(
  p_user_id UUID,
  p_location TEXT,
  p_city TEXT,
  p_country TEXT,
  p_latitude NUMERIC,
  p_longitude NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  is_premium BOOLEAN;
BEGIN
  -- Check if user is premium
  SELECT profiles.is_premium INTO is_premium
  FROM profiles
  WHERE id = p_user_id;

  IF NOT is_premium THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Travel Mode is only available for premium users'
    );
  END IF;

  -- Activate travel mode
  UPDATE profiles
  SET 
    travel_mode_active = TRUE,
    travel_location = p_location,
    travel_city = p_city,
    travel_country = p_country,
    travel_latitude = p_latitude,
    travel_longitude = p_longitude,
    travel_mode_expires_at = NULL  -- No expiration for now
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Travel Mode activated',
    'travel_city', p_city
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION activate_travel_mode(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC) TO authenticated;

-- Function to deactivate travel mode
CREATE OR REPLACE FUNCTION deactivate_travel_mode(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  UPDATE profiles
  SET 
    travel_mode_active = FALSE,
    travel_location = NULL,
    travel_city = NULL,
    travel_country = NULL,
    travel_latitude = NULL,
    travel_longitude = NULL,
    travel_mode_expires_at = NULL
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Travel Mode deactivated'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION deactivate_travel_mode(UUID) TO authenticated;

-- Update calculate_distance function to use travel location when active
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 NUMERIC,
  lon1 NUMERIC,
  lat2 NUMERIC,
  lon2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  R NUMERIC := 6371; -- Earth's radius in kilometers
  dLat NUMERIC;
  dLon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_travel_mode ON profiles(travel_mode_active) WHERE travel_mode_active = TRUE;
