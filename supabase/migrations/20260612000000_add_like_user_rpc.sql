-- Migration: add like_user, get_remaining_swipes, and calculate_distance RPC functions
-- Run via: supabase db push
-- Or paste into Supabase SQL Editor for project fqmleivxlqqnlokconux

-- ── calculate_distance (used by Radar page) ───────────────────────────────────
-- Returns profiles within max_distance km, sorted by distance asc.
DROP FUNCTION IF EXISTS calculate_distance(double precision, double precision, double precision);
CREATE OR REPLACE FUNCTION calculate_distance(
  user_lat   FLOAT,
  user_long  FLOAT,
  max_distance FLOAT DEFAULT 10
)
RETURNS TABLE (
  id                  UUID,
  full_name           TEXT,
  age                 INT,
  profile_image_url   TEXT,
  profile_images      TEXT[],
  bio                 TEXT,
  distance            FLOAT,
  latitude            FLOAT,
  longitude           FLOAT,
  interests           TEXT[],
  city                TEXT,
  country             TEXT,
  work                TEXT,
  education           TEXT,
  height              TEXT,
  zodiac_sign         TEXT,
  religion            TEXT,
  lifestyle           TEXT,
  drinking            TEXT,
  smoking             TEXT,
  pets                TEXT,
  looking_for         TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.age,
    p.profile_image_url,
    p.profile_images,
    p.bio,
    -- Haversine distance in km
    (2 * 6371 * asin(sqrt(
      power(sin(radians(p.latitude  - user_lat)  / 2), 2) +
      cos(radians(user_lat)) * cos(radians(p.latitude)) *
      power(sin(radians(p.longitude - user_long) / 2), 2)
    ))) AS distance,
    p.latitude,
    p.longitude,
    p.interests,
    p.city,
    p.country,
    p.work,
    p.education,
    p.height,
    p.zodiac_sign,
    p.religion,
    p.lifestyle,
    p.drinking,
    p.smoking,
    p.pets,
    p.looking_for
  FROM profiles p
  WHERE
    p.latitude  IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (2 * 6371 * asin(sqrt(
          power(sin(radians(p.latitude  - user_lat)  / 2), 2) +
          cos(radians(user_lat)) * cos(radians(p.latitude)) *
          power(sin(radians(p.longitude - user_long) / 2), 2)
        ))) <= max_distance
  ORDER BY distance ASC;
$$;

GRANT EXECUTE ON FUNCTION calculate_distance(FLOAT, FLOAT, FLOAT) TO authenticated;

-- ── Ensure daily_swipes table exists ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_swipes (
  user_id     UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  swipe_count INT         NOT NULL DEFAULT 0,
  last_reset  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE daily_swipes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_swipes' AND policyname = 'Users can manage own swipes'
  ) THEN
    CREATE POLICY "Users can manage own swipes"
      ON daily_swipes FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Ensure unique constraints exist ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'likes_liker_id_liked_id_key') THEN
    ALTER TABLE likes ADD CONSTRAINT likes_liker_id_liked_id_key UNIQUE (liker_id, liked_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_user1_id_user2_id_key') THEN
    ALTER TABLE matches ADD CONSTRAINT matches_user1_id_user2_id_key UNIQUE (user1_id, user2_id);
  END IF;
END $$;

-- ── get_remaining_swipes ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_remaining_swipes(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium          BOOLEAN;
  v_swipe_count         INT;
  v_last_reset          TIMESTAMPTZ;
  v_daily_limit         INT := 15;
BEGIN
  SELECT COALESCE(is_premium, false)
    INTO v_is_premium
    FROM profiles
   WHERE id = get_remaining_swipes.user_id;

  IF v_is_premium THEN
    RETURN json_build_object(
      'remaining_swipes',    999,
      'minutes_until_reset', 0,
      'is_premium',          true
    );
  END IF;

  SELECT swipe_count, last_reset
    INTO v_swipe_count, v_last_reset
    FROM daily_swipes
   WHERE user_id = get_remaining_swipes.user_id;

  -- Auto-reset if stored date is from a previous UTC day
  IF v_last_reset IS NULL
     OR DATE_TRUNC('day', v_last_reset AT TIME ZONE 'UTC')
        < DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
  THEN
    v_swipe_count := 0;
  END IF;

  RETURN json_build_object(
    'remaining_swipes',
      GREATEST(0, v_daily_limit - COALESCE(v_swipe_count, 0)),
    'minutes_until_reset',
      EXTRACT(EPOCH FROM (
        DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC' + INTERVAL '1 day') - NOW()
      )) / 60.0,
    'is_premium', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_remaining_swipes(UUID) TO authenticated;

-- ── like_user ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION like_user(current_user_id UUID, target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium          BOOLEAN;
  v_swipe_count         INT;
  v_last_reset          TIMESTAMPTZ;
  v_remaining           INT;
  v_minutes_until_reset FLOAT;
  v_daily_limit         INT := 15;
  v_is_match            BOOLEAN := false;
  v_mutual_exists       BOOLEAN;
BEGIN
  -- Prevent self-like
  IF current_user_id = target_user_id THEN
    RETURN json_build_object(
      'success', false, 'error', 'Cannot like yourself',
      'remaining_swipes', 0, 'minutes_until_reset', 0,
      'is_premium', false, 'is_match', false
    );
  END IF;

  -- Check premium status
  SELECT COALESCE(is_premium, false)
    INTO v_is_premium
    FROM profiles
   WHERE id = current_user_id;

  -- Enforce daily swipe limit for free users
  IF NOT v_is_premium THEN
    SELECT swipe_count, last_reset
      INTO v_swipe_count, v_last_reset
      FROM daily_swipes
     WHERE user_id = current_user_id;

    IF v_last_reset IS NULL
       OR DATE_TRUNC('day', v_last_reset AT TIME ZONE 'UTC')
          < DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
    THEN
      v_swipe_count := 0;
    END IF;

    IF COALESCE(v_swipe_count, 0) >= v_daily_limit THEN
      RETURN json_build_object(
        'success', false, 'error', 'Daily swipe limit reached',
        'remaining_swipes', 0,
        'minutes_until_reset',
          EXTRACT(EPOCH FROM (
            DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC' + INTERVAL '1 day') - NOW()
          )) / 60.0,
        'is_premium', false, 'is_match', false
      );
    END IF;
  END IF;

  -- Record the like (upsert so re-liking after a pass works)
  INSERT INTO likes (liker_id, liked_id, action)
  VALUES (current_user_id, target_user_id, 'like')
  ON CONFLICT (liker_id, liked_id)
    DO UPDATE SET action = 'like';

  -- Check for mutual like → match
  SELECT EXISTS (
    SELECT 1 FROM likes
     WHERE liker_id = target_user_id
       AND liked_id  = current_user_id
       AND action    = 'like'
  ) INTO v_mutual_exists;

  IF v_mutual_exists THEN
    v_is_match := true;
    INSERT INTO matches (user1_id, user2_id)
    VALUES (
      LEAST(current_user_id, target_user_id),
      GREATEST(current_user_id, target_user_id)
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
  END IF;

  -- Increment daily swipe counter for free users
  IF NOT v_is_premium THEN
    INSERT INTO daily_swipes (user_id, swipe_count, last_reset)
    VALUES (current_user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET swipe_count =
            CASE
              WHEN DATE_TRUNC('day', daily_swipes.last_reset AT TIME ZONE 'UTC')
                   < DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
              THEN 1
              ELSE daily_swipes.swipe_count + 1
            END,
          last_reset =
            CASE
              WHEN DATE_TRUNC('day', daily_swipes.last_reset AT TIME ZONE 'UTC')
                   < DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
              THEN NOW()
              ELSE daily_swipes.last_reset
            END;

    SELECT swipe_count INTO v_swipe_count
      FROM daily_swipes
     WHERE user_id = current_user_id;

    v_remaining           := GREATEST(0, v_daily_limit - COALESCE(v_swipe_count, 0));
    v_minutes_until_reset :=
      EXTRACT(EPOCH FROM (
        DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC' + INTERVAL '1 day') - NOW()
      )) / 60.0;
  ELSE
    v_remaining           := 999;
    v_minutes_until_reset := 0;
  END IF;

  RETURN json_build_object(
    'success',             true,
    'remaining_swipes',    v_remaining,
    'minutes_until_reset', v_minutes_until_reset,
    'is_premium',          v_is_premium,
    'is_match',            v_is_match
  );
END;
$$;

GRANT EXECUTE ON FUNCTION like_user(UUID, UUID) TO authenticated;
