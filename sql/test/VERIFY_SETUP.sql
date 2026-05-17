-- ✅ QUICK VERIFICATION SCRIPT
-- Run this to check if everything is set up correctly

-- Check 1: Tables exist
SELECT 'Check 1: Do tables exist?' as status;
SELECT table_name, '✅ EXISTS' as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_signals', 'call_notifications');

-- Check 2: Realtime enabled
SELECT 'Check 2: Is realtime enabled?' as status;
SELECT tablename, '✅ REALTIME ON' as result
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('call_signals', 'call_notifications');

-- Check 3: RLS Policies exist
SELECT 'Check 3: Are RLS policies created?' as status;
SELECT tablename, policyname, '✅ POLICY EXISTS' as result
FROM pg_policies
WHERE tablename IN ('call_signals', 'call_notifications')
ORDER BY tablename, policyname;

-- Check 4: Count records (for debugging)
SELECT 'Check 4: How many call records?' as status;
SELECT 'call_notifications' as table_name, COUNT(*) as count FROM call_notifications
UNION ALL
SELECT 'call_signals' as table_name, COUNT(*) as count FROM call_signals;

-- Final message
SELECT '🎉 VERIFICATION COMPLETE!' as final_status;
