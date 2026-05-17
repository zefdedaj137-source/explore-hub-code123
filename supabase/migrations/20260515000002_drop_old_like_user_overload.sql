-- Drop the old 2-parameter like_user overload that conflicts with the
-- 3-parameter version added in 20260514000001_add_superlike_flag_to_likes.sql.
-- PostgREST (PGRST203) cannot disambiguate when both signatures are present,
-- because the 3-param version has a DEFAULT on the third param, making all
-- calls without p_is_superlike ambiguous.
DROP FUNCTION IF EXISTS like_user(UUID, UUID);
