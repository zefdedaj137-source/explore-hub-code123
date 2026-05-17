-- CREATE TEST USER FOR DEVELOPMENT
-- Run this in your Supabase SQL Editor to create a test user

-- First, let's create a test user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Get the user ID we just created (you'll need this)
SELECT id, email FROM auth.users WHERE email = 'test@example.com';

-- Note: After running this, you can sign in with:
-- Email: test@example.com  
-- Password: password123