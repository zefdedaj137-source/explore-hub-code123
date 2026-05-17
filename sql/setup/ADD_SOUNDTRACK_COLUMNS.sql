-- Add Profile Soundtrack columns to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS soundtrack_title TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS soundtrack_artist TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS soundtrack_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS soundtrack_source TEXT DEFAULT NULL;

-- soundtrack_source will be 'youtube' or 'spotify'
