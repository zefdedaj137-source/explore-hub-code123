-- Clear all likes data for testing purposes
-- This will remove all likes and allow fresh testing

-- OPTION 1: Clear only likes and swipe history (RECOMMENDED)
-- This keeps matches and messages intact
DELETE FROM public.likes;
DELETE FROM public.daily_swipes;

-- OPTION 2: NUCLEAR OPTION - Clear everything including matches and messages
-- Uncomment the lines below if you want to start completely fresh:

-- Delete all messages first (references matches)
-- DELETE FROM public.messages;

-- Delete all matches
-- DELETE FROM public.matches;

-- Delete all likes
-- DELETE FROM public.likes;

-- Delete all daily swipes
-- DELETE FROM public.daily_swipes;

-- Note: User profiles and account data will NOT be deleted
-- Only interactions (likes, matches, messages, swipes) will be cleared

-- After running this, users can:
-- 1. Like profiles again from scratch
-- 2. Create new matches
-- 3. Test the notifications feature with fresh data
