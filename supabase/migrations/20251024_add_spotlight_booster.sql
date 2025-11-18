-- Add spotlight booster columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS booster_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS booster_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS boost_credits INTEGER DEFAULT 0;

-- Update last_active timestamp automatically
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_active on profile updates
DROP TRIGGER IF EXISTS update_profiles_last_active ON profiles;
CREATE TRIGGER update_profiles_last_active
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active();

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS activate_booster(UUID, INTEGER);
DROP FUNCTION IF EXISTS activate_booster_with_credit(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_spotlight_profiles(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
DROP FUNCTION IF EXISTS deactivate_expired_boosters();
DROP FUNCTION IF EXISTS grant_premium_boost_credits(UUID);

-- Function to grant 5 free boost credits when user becomes premium
CREATE OR REPLACE FUNCTION grant_premium_boost_credits(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET boost_credits = boost_credits + 5
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate booster using a credit (for premium users with free boosts)
CREATE OR REPLACE FUNCTION activate_booster_with_credit(
  user_id UUID,
  hours INTEGER DEFAULT 3
)
RETURNS JSONB AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get current credits
  SELECT boost_credits INTO current_credits
  FROM profiles
  WHERE id = user_id;

  -- Check if user has credits
  IF current_credits <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No boost credits available'
    );
  END IF;

  -- Activate booster and deduct credit
  UPDATE profiles
  SET 
    booster_active = TRUE,
    booster_expires_at = NOW() + (hours || ' hours')::INTERVAL,
    boost_credits = boost_credits - 1
  WHERE id = user_id;

  RETURN jsonb_build_object(
    'success', true,
    'credits_remaining', current_credits - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate booster (for paid boosts)
CREATE OR REPLACE FUNCTION activate_booster(
  user_id UUID,
  hours INTEGER DEFAULT 3
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    booster_active = TRUE,
    booster_expires_at = NOW() + (hours || ' hours')::INTERVAL
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get spotlight profiles (users with active boosters)
CREATE OR REPLACE FUNCTION get_spotlight_profiles(
  requesting_user_id UUID,
  user_latitude DOUBLE PRECISION,
  user_longitude DOUBLE PRECISION,
  max_distance_km INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  age INTEGER,
  location TEXT,
  city TEXT,
  country TEXT,
  bio TEXT,
  interests TEXT[],
  profile_image_url TEXT,
  profile_images TEXT[],
  verified BOOLEAN,
  zodiac_sign TEXT,
  religion TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  work TEXT,
  education TEXT,
  height TEXT,
  height_cm INTEGER,
  looking_for TEXT[],
  lifestyle TEXT,
  drinking TEXT,
  smoking TEXT,
  pets TEXT,
  last_active TIMESTAMP WITH TIME ZONE,
  booster_active BOOLEAN,
  booster_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.age,
    p.location,
    p.city,
    p.country,
    p.bio,
    p.interests,
    p.profile_image_url,
    p.profile_images,
    p.verified,
    p.zodiac_sign,
    p.religion,
    p.latitude,
    p.longitude,
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
    p.booster_expires_at
  FROM profiles p
  WHERE p.id != requesting_user_id
    AND p.booster_active = TRUE
    AND p.booster_expires_at > NOW()
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(user_latitude)) * 
        cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(user_longitude)) + 
        sin(radians(user_latitude)) * 
        sin(radians(p.latitude))
      )
    ) <= max_distance_km
  ORDER BY p.last_active DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically deactivate expired boosters
CREATE OR REPLACE FUNCTION deactivate_expired_boosters()
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET booster_active = FALSE
  WHERE booster_active = TRUE
    AND booster_expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION activate_booster(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_booster_with_credit(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_premium_boost_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_spotlight_profiles(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_expired_boosters() TO authenticated;