-- Add new columns to profiles table for enhanced profile information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS zodiac_sign TEXT,
ADD COLUMN IF NOT EXISTS religion TEXT,
ADD COLUMN IF NOT EXISTS verification_selfie_url TEXT,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS distance_km NUMERIC;

-- Add comments to document the columns
COMMENT ON COLUMN public.profiles.city IS 'User city for location matching';
COMMENT ON COLUMN public.profiles.country IS 'User country for location matching';
COMMENT ON COLUMN public.profiles.zodiac_sign IS 'Zodiac sign for compatibility matching';
COMMENT ON COLUMN public.profiles.religion IS 'Religious preference for compatibility matching';
COMMENT ON COLUMN public.profiles.verification_selfie_url IS 'URL to verification selfie image';
COMMENT ON COLUMN public.profiles.verified IS 'Whether user has completed selfie verification';
COMMENT ON COLUMN public.profiles.distance_km IS 'Calculated distance in kilometers from current user';

-- Update the update trigger to include new columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';