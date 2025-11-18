-- Add looking_for column to profiles table
-- This stores what users are looking for (Dating, Friends, Fun & Casual, Long-term Relationship)

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS looking_for text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN profiles.looking_for IS 'What the user is looking for: Dating, Friends, Fun & Casual, Long-term Relationship';
