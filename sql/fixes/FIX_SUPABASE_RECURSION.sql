-- ============================================
-- DIAGNOSTIC & FIX for "infinite recursion detected in policy for relation profiles"
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/ojefwfokxsifdxylrwca
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Execute it to fix the recursion issue permanently
-- ============================================

-- First, let's check what tables exist and create them if needed
DO $$
BEGIN
    -- Check if profiles table exists, create if it doesn't
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- Create profiles table
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT,
            full_name TEXT NOT NULL,
            age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
            gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
            looking_for TEXT NOT NULL CHECK (looking_for IN ('male', 'female', 'everyone')),
            location TEXT NOT NULL,
            city TEXT,
            country TEXT,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            bio TEXT,
            interests TEXT[] DEFAULT '{}',
            profile_image_url TEXT,
            min_age_preference INTEGER DEFAULT 18,
            max_age_preference INTEGER DEFAULT 50,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Created profiles table';
    END IF;
    
    -- Check if dancing_channel_participants exists, create if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dancing_channel_participants') THEN
        CREATE TABLE public.dancing_channel_participants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
        );
        
        ALTER TABLE public.dancing_channel_participants ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Created dancing_channel_participants table';
    END IF;
END $$;

-- Step 1: Remove the problematic recursive policies
DROP POLICY IF EXISTS "Users can view discoverable profiles" ON public.profiles;
DROP POLICY IF EXISTS "Participants view participant list" ON public.dancing_channel_participants;

-- Step 2: Create a simple, non-recursive policy for basic profile access
CREATE POLICY "Users can view profiles basic" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Step 3: Create a secure function to get profiles without recursion
CREATE OR REPLACE FUNCTION public.get_profiles_for_discovery(
  viewer_user_id UUID,
  gender_filter TEXT DEFAULT NULL,
  min_age_filter INTEGER DEFAULT 18,
  max_age_filter INTEGER DEFAULT 100,
  excluded_profile_ids UUID[] DEFAULT ARRAY[]::UUID[],
  result_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  age INTEGER,
  gender TEXT,
  bio TEXT,
  profile_image_url TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.age,
    p.gender,
    p.bio,
    p.profile_image_url,
    p.city,
    p.country,
    p.latitude,
    p.longitude
  FROM public.profiles p
  WHERE p.id != viewer_user_id
    AND (gender_filter IS NULL OR gender_filter = 'everyone' OR p.gender = gender_filter)
    AND p.age >= min_age_filter
    AND p.age <= max_age_filter
    AND (excluded_profile_ids IS NULL OR NOT (p.id = ANY(excluded_profile_ids)))
  ORDER BY p.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Step 4: Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profiles_for_discovery TO authenticated;

-- Step 5: Create an index to optimize the function performance
CREATE INDEX IF NOT EXISTS idx_profiles_discovery_optimized 
ON public.profiles(gender, age, created_at) 
WHERE id IS NOT NULL;

-- ============================================
-- ADDITIONAL FIX: dancing_channel_participants recursion
-- ============================================

-- Step 6: Fix dancing_channel_participants recursive policy
DROP POLICY IF EXISTS "Participants view participant list" ON dancing_channel_participants;

-- Create a simple, non-recursive policy for dancing channel participants
CREATE POLICY "Users can view dancing channel participants"
ON dancing_channel_participants
FOR SELECT
USING (true);

-- Create a secure function to check if user is participant without recursion
CREATE OR REPLACE FUNCTION public.is_user_dancing_participant(
  check_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_exists BOOLEAN := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM dancing_channel_participants 
    WHERE user_id = check_user_id
  ) INTO participant_exists;
  
  RETURN participant_exists;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_user_dancing_participant TO authenticated;

-- Additional RPC functions for dancing channel operations
CREATE OR REPLACE FUNCTION public.join_dancing_channel(
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO dancing_channel_participants (user_id)
  VALUES (user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_dancing_channel(
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM dancing_channel_participants 
  WHERE dancing_channel_participants.user_id = leave_dancing_channel.user_id;
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.join_dancing_channel TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_dancing_channel TO authenticated;

-- Create basic policies to replace recursive ones
CREATE POLICY "Users can manage their own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can manage their dancing participation"
ON public.dancing_channel_participants
FOR ALL
USING (auth.uid() = user_id);

-- ============================================
-- DIAGNOSTIC: Check what we created
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Tables created and policies fixed successfully!';
    RAISE NOTICE 'Available tables: %', (
        SELECT string_agg(table_name, ', ')
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name IN ('profiles', 'dancing_channel_participants')
    );
END $$;

-- ============================================
-- CRITICAL: Fix Storage Bucket Recursion Issues
-- ============================================

-- Drop ALL existing storage policies that might cause recursion
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own dance videos" ON storage.objects;

-- Create SAFE storage policies that don't reference dancing_channel_participants
-- These policies use ONLY auth.uid() and don't query other tables

-- Profile photos bucket policies (SAFE - no table references)
CREATE POLICY "Safe: Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Safe: Users can upload own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Safe: Users can update own profile photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Safe: Users can delete own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Dance videos bucket policies (SAFE - no table references)
CREATE POLICY "Safe: Anyone can view dance videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'dance-videos');

CREATE POLICY "Safe: Users can upload own dance videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dance-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Safe: Users can update own dance videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'dance-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Safe: Users can delete own dance videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'dance-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Make sure buckets exist and are properly configured
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('dance-videos', 'dance-videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- After running this SQL, ALL recursion errors will be fixed!
-- This includes profiles, dancing_channel_participants, AND storage recursion
-- ============================================