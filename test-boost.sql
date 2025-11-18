-- Test SQL Commands for Boost Feature
-- Run these in Supabase SQL Editor to test the boost system

-- 1. Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('boost_credits', 'booster_active', 'booster_expires_at', 'last_active');

-- 2. Grant yourself 5 boost credits
-- Replace 'YOUR-USER-ID' with your actual user ID
UPDATE profiles 
SET boost_credits = 5 
WHERE id = '596116f8-cde5-4a9e-bb4c-6e91f7b94eae';

-- 3. Activate boost for yourself (to test visibility)
UPDATE profiles 
SET booster_active = true,
    booster_expires_at = NOW() + INTERVAL '3 hours',
    latitude = 47.8095,  -- Example: Vienna coordinates
    longitude = 16.3523
WHERE id = '596116f8-cde5-4a9e-bb4c-6e91f7b94eae';

-- 4. Check your boost status
SELECT id, full_name, boost_credits, booster_active, booster_expires_at, latitude, longitude
FROM profiles
WHERE id = '596116f8-cde5-4a9e-bb4c-6e91f7b94eae';

-- 5. Test the get_spotlight_profiles function
-- Replace coordinates with your location
SELECT * FROM get_spotlight_profiles(
  '596116f8-cde5-4a9e-bb4c-6e91f7b94eae'::uuid,  -- your user ID
  47.8095,  -- your latitude
  16.3523,  -- your longitude
  100       -- max distance in km
);

-- 6. Create a second test user with boost (if you have another account)
-- Replace 'SECOND-USER-ID' with another user's ID
UPDATE profiles 
SET booster_active = true,
    booster_expires_at = NOW() + INTERVAL '3 hours',
    latitude = 48.2082,  -- Example: Vienna coordinates
    longitude = 16.3738,
    boost_credits = 5
WHERE id = 'SECOND-USER-ID';

-- 7. View all currently boosted profiles
SELECT id, full_name, booster_active, booster_expires_at, city, country
FROM profiles
WHERE booster_active = true 
AND booster_expires_at > NOW();

-- 8. Deactivate boost (to test expiration)
UPDATE profiles 
SET booster_active = false,
    booster_expires_at = NULL
WHERE id = '596116f8-cde5-4a9e-bb4c-6e91f7b94eae';
