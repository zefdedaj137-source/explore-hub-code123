-- Description: Grant proper table-level permissions on user_achievements
-- Without these grants PostgREST returns 400 even when RLS policies are in place.
-- Created: 2026-04-27

GRANT SELECT, INSERT ON user_achievements TO authenticated;
GRANT SELECT, INSERT ON user_achievements TO service_role;
