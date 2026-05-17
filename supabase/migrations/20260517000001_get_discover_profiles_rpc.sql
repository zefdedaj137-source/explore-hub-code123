-- Migration: get_discover_profiles RPC
-- Replaces the client-side "fetch all profiles" loop in Discover.tsx with a
-- single server-side function that applies every filter in PostgreSQL and
-- returns at most `result_limit` rows.
--
-- Key improvements over the previous approach:
--   • No more "while (hasMore)" loop downloading the entire profiles table
--   • Excludes deactivated + incognito users in SQL (not in JS)
--   • Excludes liked / passed / matched profiles via DB anti-joins
--   • Mutual gender preference check in SQL
--   • Age & distance filters in SQL (uses existing calculate_distance())
--   • All premium filters forwarded as parameters
--   • Cursor/offset pagination so the client can fetch the next batch
--     when the card stack runs low

CREATE OR REPLACE FUNCTION get_discover_profiles(
  -- Who is asking
  current_user_id       UUID,
  -- Caller supplies the effective lat/lon (travel or home) already resolved
  user_latitude         DOUBLE PRECISION,
  user_longitude        DOUBLE PRECISION,
  -- Basic filters (always applied)
  p_min_age             INT              DEFAULT 18,
  p_max_age             INT              DEFAULT 50,
  p_max_distance_km     INT              DEFAULT 100,
  p_gender_pref         TEXT             DEFAULT 'everyone',
  p_my_gender           TEXT             DEFAULT '',
  -- Premium filters (ignored when p_is_premium = FALSE)
  p_is_premium          BOOLEAN          DEFAULT FALSE,
  p_verified_only       BOOLEAN          DEFAULT FALSE,
  p_has_profile_image   BOOLEAN          DEFAULT FALSE,
  p_interests           TEXT[]           DEFAULT ARRAY[]::TEXT[],
  p_min_height          INT              DEFAULT 0,
  p_max_height          INT              DEFAULT 250,
  p_education           TEXT             DEFAULT 'any',
  p_smoking             TEXT             DEFAULT 'any',
  p_drinking            TEXT             DEFAULT 'any',
  p_religion            TEXT             DEFAULT 'any',
  p_looking_for         TEXT             DEFAULT 'any',
  p_zodiac_sign         TEXT             DEFAULT 'any',
  -- Pagination
  p_offset              INT              DEFAULT 0,
  p_limit               INT              DEFAULT 50
)
RETURNS TABLE (
  id                    UUID,
  full_name             TEXT,
  age                   INTEGER,
  gender                TEXT,
  gender_preference     TEXT,
  location              TEXT,
  city                  TEXT,
  country               TEXT,
  bio                   TEXT,
  interests             TEXT[],
  profile_image_url     TEXT,
  profile_images        TEXT[],
  video_intro_url       TEXT,
  verified              BOOLEAN,
  is_premium            BOOLEAN,
  zodiac_sign           TEXT,
  religion              TEXT,
  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,
  travel_mode_active    BOOLEAN,
  travel_city           TEXT,
  travel_latitude       DOUBLE PRECISION,
  travel_longitude      DOUBLE PRECISION,
  work                  TEXT,
  education             TEXT,
  height                TEXT,
  height_cm             INTEGER,
  looking_for           TEXT[],
  lifestyle             TEXT,
  drinking              TEXT,
  smoking               TEXT,
  pets                  TEXT,
  last_active           TIMESTAMPTZ,
  booster_active        BOOLEAN,
  booster_expires_at    TIMESTAMPTZ,
  mood_emoji            TEXT,
  mood_text             TEXT,
  soundtrack_title      TEXT,
  soundtrack_artist     TEXT,
  soundtrack_url        TEXT,
  soundtrack_source     TEXT,
  incognito_mode        BOOLEAN,
  distance_km           DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_effective_lat  DOUBLE PRECISION;
  v_effective_lon  DOUBLE PRECISION;
BEGIN
  -- Resolve effective coordinates: NULL if the caller sent 0/0 (unset)
  v_effective_lat := NULLIF(user_latitude,  0);
  v_effective_lon := NULLIF(user_longitude, 0);

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.age,
    p.gender,
    p.gender_preference,
    p.location,
    p.city,
    p.country,
    p.bio,
    COALESCE(p.interests, ARRAY[]::TEXT[]),
    p.profile_image_url,
    p.profile_images,
    p.video_intro_url,
    p.verified,
    p.is_premium,
    p.zodiac_sign,
    p.religion,
    p.latitude,
    p.longitude,
    p.travel_mode_active,
    p.travel_city,
    p.travel_latitude::DOUBLE PRECISION,
    p.travel_longitude::DOUBLE PRECISION,
    p.work,
    p.education,
    p.height,
    p.height_cm,
    p.looking_for,
    p.lifestyle,
    p.drinking,
    p.smoking,
    p.pets,
    p.last_active,
    p.booster_active,
    p.booster_expires_at,
    p.mood_emoji,
    p.mood_text,
    p.soundtrack_title,
    p.soundtrack_artist,
    p.soundtrack_url,
    p.soundtrack_source,
    p.incognito_mode,
    -- Effective distance: prefer travel coords for the profile being shown
    CASE
      WHEN v_effective_lat IS NOT NULL AND v_effective_lon IS NOT NULL THEN
        calculate_distance(
          v_effective_lat,
          v_effective_lon,
          COALESCE(
            NULLIF(CASE WHEN p.travel_mode_active THEN p.travel_latitude::DOUBLE PRECISION  ELSE NULL END, 0),
            p.latitude
          ),
          COALESCE(
            NULLIF(CASE WHEN p.travel_mode_active THEN p.travel_longitude::DOUBLE PRECISION ELSE NULL END, 0),
            p.longitude
          )
        )
      ELSE NULL
    END AS distance_km
  FROM profiles p
  WHERE
    -- Not the requesting user
    p.id <> current_user_id

    -- Active account only
    AND p.deactivated_at IS NULL

    -- Respect incognito mode
    AND (p.incognito_mode IS NULL OR p.incognito_mode = FALSE)

    -- Profile must be usable
    AND p.full_name IS NOT NULL
    AND p.age       IS NOT NULL

    -- Exclude profiles already liked, super-liked, or passed this session
    AND NOT EXISTS (
      SELECT 1 FROM likes l
      WHERE l.liker_id = current_user_id
        AND l.liked_id = p.id
    )

    -- Exclude existing matches
    AND NOT EXISTS (
      SELECT 1 FROM matches m
      WHERE (m.user1_id = current_user_id AND m.user2_id = p.id)
         OR (m.user2_id = current_user_id AND m.user1_id = p.id)
    )

    -- ── Gender mutual-preference filter ────────────────────────────────────
    -- 1. I want to see their gender
    AND (
      p_gender_pref = ''
      OR LOWER(p_gender_pref) = 'everyone'
      OR p.gender IS NULL OR p.gender = ''
      OR LOWER(p.gender) = LOWER(p_gender_pref)
    )
    -- 2. They want to see my gender
    AND (
      p.gender_preference IS NULL OR p.gender_preference = ''
      OR LOWER(p.gender_preference) = 'everyone'
      OR p_my_gender = ''
      OR LOWER(p.gender_preference) = LOWER(p_my_gender)
    )

    -- ── Age range ──────────────────────────────────────────────────────────
    AND p.age >= p_min_age
    AND p.age <= p_max_age

    -- ── Distance filter (skipped when no coordinates available) ───────────
    AND (
      v_effective_lat IS NULL OR v_effective_lon IS NULL
      OR p.latitude IS NULL OR p.longitude IS NULL
      OR calculate_distance(
           v_effective_lat, v_effective_lon,
           COALESCE(NULLIF(CASE WHEN p.travel_mode_active THEN p.travel_latitude::DOUBLE PRECISION  ELSE NULL END, 0), p.latitude),
           COALESCE(NULLIF(CASE WHEN p.travel_mode_active THEN p.travel_longitude::DOUBLE PRECISION ELSE NULL END, 0), p.longitude)
         ) <= p_max_distance_km
    )

    -- ── Premium-only filters (only applied when caller is premium) ─────────
    AND (NOT p_is_premium OR NOT p_verified_only       OR p.verified = TRUE)
    AND (NOT p_is_premium OR NOT p_has_profile_image   OR p.profile_image_url IS NOT NULL)
    AND (
      NOT p_is_premium
      OR array_length(p_interests, 1) IS NULL
      OR p.interests && p_interests           -- overlap operator: any shared interest
    )
    AND (NOT p_is_premium OR p_min_height <= 0         OR p.height_cm IS NULL OR p.height_cm >= p_min_height)
    AND (NOT p_is_premium OR p_max_height >= 250        OR p.height_cm IS NULL OR p.height_cm <= p_max_height)
    AND (NOT p_is_premium OR p_education  = 'any'       OR LOWER(p.education)         = LOWER(p_education))
    AND (NOT p_is_premium OR p_smoking    = 'any'       OR LOWER(p.smoking)           = LOWER(p_smoking))
    AND (NOT p_is_premium OR p_drinking   = 'any'       OR LOWER(p.drinking)          = LOWER(p_drinking))
    AND (NOT p_is_premium OR p_religion   = 'any'       OR LOWER(p.religion)          = LOWER(p_religion))
    AND (NOT p_is_premium OR p_zodiac_sign = 'any'      OR LOWER(p.zodiac_sign)       = LOWER(p_zodiac_sign))
    AND (
      NOT p_is_premium
      OR p_looking_for = 'any'
      OR EXISTS (
        SELECT 1 FROM unnest(p.looking_for) lf
        WHERE LOWER(lf) LIKE '%' || LOWER(p_looking_for) || '%'
      )
    )

  ORDER BY p.last_active DESC NULLS LAST
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_discover_profiles(
  UUID, DOUBLE PRECISION, DOUBLE PRECISION,
  INT, INT, INT, TEXT, TEXT,
  BOOLEAN, BOOLEAN, BOOLEAN, TEXT[], INT, INT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INT, INT
) TO authenticated;
