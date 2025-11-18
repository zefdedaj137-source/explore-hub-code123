-- SIMPLE LIKES TABLE FIX
-- Run this in your Supabase SQL Editor

-- First check what columns exist in likes table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'likes' 
ORDER BY ordinal_position;

-- Add the action column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'likes' AND column_name = 'action'
    ) THEN
        ALTER TABLE likes ADD COLUMN action TEXT DEFAULT 'like';
        UPDATE likes SET action = 'like' WHERE action IS NULL;
    END IF;
END $$;

-- Fix RLS policies for profiles (main issue)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Enable read access for authenticated users" ON profiles
    FOR SELECT USING (auth.uid() = id OR auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Simple likes policies
DROP POLICY IF EXISTS "Users can view their likes" ON likes;
DROP POLICY IF EXISTS "Users can manage their likes" ON likes;

CREATE POLICY "Enable all access for authenticated users" ON likes
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;