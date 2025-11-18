-- Clear likes and matches data
-- This script removes all likes, matches, and related data

-- Clear all likes
DELETE FROM likes;

-- Clear all matches
DELETE FROM matches;

-- Clear all messages (since they're tied to matches)
DELETE FROM messages;

-- Clear instant messages (optional - remove if you want to keep these)
DELETE FROM instant_messages;

-- Reset any match-related counters or stats (optional)
-- UPDATE profiles SET match_count = 0 WHERE match_count > 0;

-- Confirmation
SELECT 'Likes, matches, messages, and instant messages cleared successfully' as status;
