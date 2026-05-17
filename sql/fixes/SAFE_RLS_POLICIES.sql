-- SAFE RLS POLICIES FIX
-- Run this in your Supabase SQL Editor

-- First, let's check the actual schema of the likes table
-- Run this query to see what columns exist:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'likes';

-- Drop existing problematic policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new, simpler policies for profiles
CREATE POLICY "Enable read access for authenticated users" ON profiles
    FOR SELECT USING (auth.uid() = id OR auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Only create likes policies if the table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'likes') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their likes" ON likes;
        DROP POLICY IF EXISTS "Users can manage their likes" ON likes;
        
        -- Create simple policies (adjust column names as needed)
        CREATE POLICY "Enable all access for authenticated users" ON likes
            FOR ALL USING (auth.uid() IS NOT NULL);
            
        -- Enable RLS on likes table
        ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
    ELSE
        -- Create the likes table if it doesn't exist
        CREATE TABLE IF NOT EXISTS likes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            liker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            liked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            action TEXT NOT NULL DEFAULT 'like',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(liker_id, liked_id)
        );
        
        -- Create policies for new table
        CREATE POLICY "Enable all access for authenticated users" ON likes
            FOR ALL USING (auth.uid() IS NOT NULL);
            
        -- Enable RLS
        ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Make sure RLS is enabled on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;