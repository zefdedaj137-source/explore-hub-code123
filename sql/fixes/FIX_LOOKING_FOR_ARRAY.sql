-- Fix looking_for column to be text array instead of text
-- Run this in Supabase SQL Editor

-- First, drop the column if it exists as wrong type
ALTER TABLE profiles DROP COLUMN IF EXISTS looking_for;

-- Add it back as text array (correct type)
ALTER TABLE profiles ADD COLUMN looking_for text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN profiles.looking_for IS 'What the user is looking for: Dating, Friends, Fun & Casual, Long-term Relationship';
