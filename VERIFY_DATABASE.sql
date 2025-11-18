-- =====================================================
-- DATABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to check your setup
-- =====================================================

-- 1. CHECK IF FUNCTIONS EXIST
SELECT '=== CHECKING FUNCTIONS ===' as step;
SELECT 
  routine_name as function_name,
  'EXISTS ✓' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name IN ('like_user', 'get_remaining_swipes', 'unmatch_user')

UNION ALL

SELECT 
  func_name as function_name,
  'MISSING ✗' as status
FROM (
  VALUES 
    ('like_user'),
    ('get_remaining_swipes'),
    ('unmatch_user')
) AS funcs(func_name)
WHERE func_name NOT IN (
  SELECT routine_name 
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION'
);

-- 2. CHECK IF TABLES EXIST
SELECT '=== CHECKING TABLES ===' as step;
SELECT 
  table_name,
  'EXISTS ✓' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('likes', 'matches', 'daily_swipes', 'profiles')

UNION ALL

SELECT 
  tbl_name as table_name,
  'MISSING ✗' as status
FROM (
  VALUES 
    ('likes'),
    ('matches'),
    ('daily_swipes'),
    ('profiles')
) AS tbls(tbl_name)
WHERE tbl_name NOT IN (
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
);

-- 3. CHECK RLS POLICIES
SELECT '=== CHECKING RLS POLICIES ===' as step;
SELECT 
  schemaname,
  tablename,
  policyname,
  'POLICY EXISTS ✓' as status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('likes', 'matches', 'daily_swipes', 'profiles')
ORDER BY tablename, policyname;

-- 4. COUNT RECORDS (to see if you have data)
SELECT '=== RECORD COUNTS ===' as step;

SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'likes' as table_name, COUNT(*) as record_count FROM likes
UNION ALL
SELECT 'matches' as table_name, COUNT(*) as record_count FROM matches
UNION ALL
SELECT 'daily_swipes' as table_name, COUNT(*) as record_count FROM daily_swipes;

-- 5. TEST FUNCTIONS (replace YOUR_USER_ID with actual user ID)
SELECT '=== TESTING FUNCTIONS ===' as step;

-- Get your user ID first
SELECT 
  'Your User ID: ' || id as info,
  email
FROM auth.users 
LIMIT 1;

-- Uncomment below and replace YOUR_USER_ID to test
-- SELECT get_remaining_swipes('YOUR_USER_ID');

SELECT '=== VERIFICATION COMPLETE ===' as step;
SELECT 'Check the results above. All items should show EXISTS ✓' as instructions;
