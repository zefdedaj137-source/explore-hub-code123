-- Add discovery preference columns to profiles table

-- Add min and max age preference columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS min_age_preference INTEGER DEFAULT 18 CHECK (min_age_preference >= 18 AND min_age_preference <= 99);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS max_age_preference INTEGER DEFAULT 99 CHECK (max_age_preference >= 18 AND max_age_preference <= 99);

-- Add maximum distance preference column (in kilometers)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS max_distance_km INTEGER DEFAULT 100 CHECK (max_distance_km >= 1 AND max_distance_km <= 500);

-- Add comments for documentation
COMMENT ON COLUMN profiles.min_age_preference IS 'Minimum age preference for discovery (18-99)';
COMMENT ON COLUMN profiles.max_age_preference IS 'Maximum age preference for discovery (18-99)';
COMMENT ON COLUMN profiles.max_distance_km IS 'Maximum distance preference for discovery in kilometers (1-500)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_age_preferences ON profiles(min_age_preference, max_age_preference);
CREATE INDEX IF NOT EXISTS idx_profiles_distance_preference ON profiles(max_distance_km);

-- Update existing profiles to have default values
UPDATE profiles 
SET 
  min_age_preference = COALESCE(min_age_preference, 18),
  max_age_preference = COALESCE(max_age_preference, 99),
  max_distance_km = COALESCE(max_distance_km, 100)
WHERE min_age_preference IS NULL 
   OR max_age_preference IS NULL 
   OR max_distance_km IS NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
