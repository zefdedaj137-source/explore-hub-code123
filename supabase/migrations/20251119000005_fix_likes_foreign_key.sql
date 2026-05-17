-- Fix foreign key relationship in likes table
-- This ensures referential integrity between likes and profiles tables

-- First, clean up any orphaned records (likes that reference non-existent profiles)
DELETE FROM likes 
WHERE liker_id NOT IN (SELECT id FROM profiles);

DELETE FROM likes 
WHERE liked_id NOT IN (SELECT id FROM profiles);

-- Drop existing foreign key constraints if they exist (to avoid conflicts)
ALTER TABLE likes 
DROP CONSTRAINT IF EXISTS likes_liker_id_fkey;

ALTER TABLE likes 
DROP CONSTRAINT IF EXISTS likes_liked_id_fkey;

-- Add proper foreign key constraints with CASCADE on delete
ALTER TABLE likes 
ADD CONSTRAINT likes_liker_id_fkey 
FOREIGN KEY (liker_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

ALTER TABLE likes 
ADD CONSTRAINT likes_liked_id_fkey 
FOREIGN KEY (liked_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Create indexes for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_likes_liker_id ON likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_likes_liked_id ON likes(liked_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
