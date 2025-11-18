-- Add home_country column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_country TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.home_country IS 'User''s home country or country of origin';
