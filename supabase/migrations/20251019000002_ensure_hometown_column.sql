-- Ensure hometown column exists (rename from heimatort if it exists, or add if missing)
DO $$
BEGIN
  -- Check if heimatort column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'heimatort'
  ) THEN
    -- Rename heimatort to hometown
    ALTER TABLE public.profiles RENAME COLUMN heimatort TO hometown;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'hometown'
  ) THEN
    -- Add hometown column if it doesn't exist
    ALTER TABLE public.profiles ADD COLUMN hometown text;
  END IF;
END $$;
