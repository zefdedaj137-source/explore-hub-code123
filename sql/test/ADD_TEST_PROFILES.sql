-- ============================================
-- ADD TWO TEST PROFILES
-- Run this in your Supabase SQL Editor
-- ============================================

-- Test User 1: Sarah Johnson
DO $$
DECLARE
  user1_id UUID;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'sarah.test@example.com',
    crypt('TestPass123!', gen_salt('bf')),
    NOW(), NOW(), NOW(), '', '', '', ''
  )
  RETURNING id INTO user1_id;

  -- Create profile
  INSERT INTO public.profiles (
    id, email, full_name, age, gender, looking_for, location,
    city, country, latitude, longitude,
    bio, interests, work, education,
    height_cm, body_type, religion, zodiac_sign,
    smoking, drinking, pets, languages,
    profile_image_url, profile_images, verified,
    min_age_preference, max_age_preference, max_distance_km
  ) VALUES (
    user1_id,
    'sarah.test@example.com',
    'Sarah Johnson',
    26,
    'female',
    ARRAY['male'],
    'Vienna, Austria',
    'Vienna',
    'Austria',
    48.2082,
    16.3738,
    'Coffee addict ☕ | Dog mom 🐕 | Love hiking and exploring new restaurants. Looking for someone who can make me laugh and isn''t afraid of adventure!',
    ARRAY['Hiking', 'Photography', 'Cooking', 'Travel', 'Dogs', 'Coffee'],
    'Graphic Designer at a creative agency',
    'BFA from NYU',
    168,
    'Athletic',
    'Spiritual',
    'Libra',
    'Never',
    'Socially',
    'Dog',
    ARRAY['English', 'French'],
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop',
    ARRAY[
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop'
    ],
    true,
    22, 35, 50
  );

  RAISE NOTICE 'Created Test User 1: Sarah Johnson (ID: %)', user1_id;
END $$;

-- Test User 2: Marcus Rivera
DO $$
DECLARE
  user2_id UUID;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'marcus.test@example.com',
    crypt('TestPass123!', gen_salt('bf')),
    NOW(), NOW(), NOW(), '', '', '', ''
  )
  RETURNING id INTO user2_id;

  -- Create profile
  INSERT INTO public.profiles (
    id, email, full_name, age, gender, looking_for, location,
    city, country, latitude, longitude,
    bio, interests, work, education,
    height_cm, body_type, religion, zodiac_sign,
    smoking, drinking, pets, languages,
    profile_image_url, profile_images, verified,
    min_age_preference, max_age_preference, max_distance_km
  ) VALUES (
    user2_id,
    'marcus.test@example.com',
    'Marcus Rivera',
    29,
    'male',
    ARRAY['female'],
    'Baden, Austria',
    'Baden',
    'Austria',
    47.9990,
    16.2309,
    'Music producer by day, amateur chef by night 🎵🍳 | Gym enthusiast | Always down for a spontaneous road trip. Let''s grab tacos and talk about life.',
    ARRAY['Music', 'Fitness', 'Cooking', 'Travel', 'Movies', 'Basketball'],
    'Music Producer at an independent label',
    'BA in Music Production from Berklee',
    183,
    'Athletic',
    'Christian',
    'Scorpio',
    'Never',
    'Socially',
    'Cat',
    ARRAY['English', 'Spanish'],
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
    ARRAY[
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop'
    ],
    true,
    21, 32, 50
  );

  RAISE NOTICE 'Created Test User 2: Marcus Rivera (ID: %)', user2_id;
END $$;

-- Verify both were created
SELECT id, full_name, age, gender, city, email
FROM public.profiles
WHERE email IN ('sarah.test@example.com', 'marcus.test@example.com');
