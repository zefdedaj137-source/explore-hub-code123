-- Add save_data column to profiles
-- When false, the user's profile view history will not be recorded (privacy preference)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS save_data boolean NOT NULL DEFAULT true;
