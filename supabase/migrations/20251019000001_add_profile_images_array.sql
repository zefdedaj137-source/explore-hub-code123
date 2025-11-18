-- Add profile_images array column to profiles table
-- This allows users to upload up to 10 photos

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_images text[] DEFAULT '{}';

COMMENT ON COLUMN public.profiles.profile_images IS 'Array of up to 10 profile image URLs. First image is the primary profile photo.';

-- Update the profile_image_url to sync with first image in array (backward compatibility)
-- Create a trigger to keep profile_image_url in sync with profile_images[1]
CREATE OR REPLACE FUNCTION sync_profile_image_url()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile_images array is not empty, set profile_image_url to first image
  IF array_length(NEW.profile_images, 1) > 0 THEN
    NEW.profile_image_url := NEW.profile_images[1];
  ELSE
    NEW.profile_image_url := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_profile_image_trigger ON public.profiles;
CREATE TRIGGER sync_profile_image_trigger
  BEFORE INSERT OR UPDATE OF profile_images ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_image_url();

COMMENT ON FUNCTION sync_profile_image_url() IS 'Automatically syncs profile_image_url with the first image in profile_images array';
