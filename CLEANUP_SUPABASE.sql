-- =====================================================
-- SUPABASE CLEANUP SCRIPT
-- This removes old/duplicate functions and prepares for fresh install
-- Run this FIRST before running FINAL_DATING_APP_DATABASE.sql
-- =====================================================

-- STEP 1: DROP ALL OLD/DUPLICATE FUNCTIONS
DROP FUNCTION IF EXISTS create_like_and_check_match CASCADE;
DROP FUNCTION IF EXISTS remove_match CASCADE;
DROP FUNCTION IF EXISTS get_remaining_swipes CASCADE;
DROP FUNCTION IF EXISTS like_user CASCADE;
DROP FUNCTION IF EXISTS unmatch_user CASCADE;

-- STEP 2: DROP OLD TABLES (if you want a fresh start)
-- WARNING: This will delete all your data!
-- Comment out these lines if you want to keep existing data
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS daily_swipes CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- STEP 3: VERIFY CLEANUP
SELECT '=== CLEANUP COMPLETE ===' as status;
SELECT 'All old functions and tables removed' as message;
SELECT 'Next step: Run FINAL_DATING_APP_DATABASE.sql' as next_action;

-- STEP 4: CHECK REMAINING FUNCTIONS (should be empty or only your custom ones)
SELECT '=== REMAINING FUNCTIONS ===' as check;
SELECT routine_name as function_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name IN ('like_user', 'get_remaining_swipes', 'unmatch_user', 'create_like_and_check_match', 'remove_match');

-- If the above query returns no rows, cleanup was successful!
