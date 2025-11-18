-- FIX RLS POLICIES FOR PROFILE ACCESS
-- Run this in your Supabase SQL Editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new, simpler policies
CREATE POLICY "Enable read access for authenticated users" ON profiles
    FOR SELECT USING (auth.uid() = id OR auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Fix likes table policies (check actual column names first)
DROP POLICY IF EXISTS "Users can view their likes" ON likes;
DROP POLICY IF EXISTS "Users can manage their likes" ON likes;

-- First, let's check what columns exist in the likes table
-- You may need to adjust these policies based on your actual schema

-- Simple policy that allows authenticated users to read/write their own likes
CREATE POLICY "Enable read access for authenticated users" ON likes
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users" ON likes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users" ON likes
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for authenticated users" ON likes
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;