-- Force PostgREST to reload its schema cache.
-- Fixes 400 Bad Request on user_achievements if cache became stale.

GRANT SELECT, INSERT ON user_achievements TO authenticated;
GRANT SELECT, INSERT ON user_achievements TO service_role;

NOTIFY pgrst, 'reload schema';
