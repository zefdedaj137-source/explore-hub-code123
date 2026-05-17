-- Fix looking_for schema conflict and add gender_preference

-- The looking_for column was defined as TEXT in the initial schema (for gender preference)
-- but later migrations changed it to TEXT[] (for relationship types)
-- This creates a gender_preference column for clarity and consistency

-- Add gender preference column (for discovery: who are you interested in?)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gender_preference TEXT DEFAULT 'everyone' 
CHECK (gender_preference IN ('male', 'female', 'everyone'));

-- Migrate existing looking_for data if it's TEXT type
-- Copy single text values to gender_preference
DO $$
BEGIN
  -- Only run if looking_for is TEXT type (not array)
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'looking_for') = 'text' THEN
    
    UPDATE profiles 
    SET gender_preference = looking_for 
    WHERE looking_for IN ('male', 'female', 'everyone');
    
    -- Now convert looking_for to array type for relationship preferences
    ALTER TABLE profiles ALTER COLUMN looking_for TYPE TEXT[] USING ARRAY[looking_for]::TEXT[];
    ALTER TABLE profiles ALTER COLUMN looking_for SET DEFAULT '{}';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.gender_preference IS 'Gender preference for discovery: male, female, or everyone';
COMMENT ON COLUMN profiles.looking_for IS 'Relationship types user is looking for: Dating, Friends, Fun & Casual, Long-term Relationship';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_gender_preference ON profiles(gender_preference);

-- Update existing profiles to have default gender_preference if null
UPDATE profiles 
SET gender_preference = COALESCE(gender_preference, 'everyone')
WHERE gender_preference IS NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
