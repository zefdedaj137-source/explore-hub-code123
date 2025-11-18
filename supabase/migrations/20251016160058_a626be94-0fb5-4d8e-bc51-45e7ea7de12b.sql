-- Add new profile fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS work text,
ADD COLUMN IF NOT EXISTS languages text[],
ADD COLUMN IF NOT EXISTS hometown text,
ADD COLUMN IF NOT EXISTS height_cm integer,
ADD COLUMN IF NOT EXISTS smoking text,
ADD COLUMN IF NOT EXISTS pets text,
ADD COLUMN IF NOT EXISTS has_kids text,
ADD COLUMN IF NOT EXISTS wants_kids text;