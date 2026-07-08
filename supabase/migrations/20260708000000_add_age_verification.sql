-- Migration: Add date_of_birth and age_verified columns for App Store compliance
-- Purpose: Enforce 18+ minimum age requirement at the database level

-- Add columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS age_verification_method VARCHAR(50); -- 'email_signup', 'oauth_callback', etc.

-- Create a check constraint to enforce 18+ minimum age
-- Calculate age as of today: EXTRACT(YEAR FROM age(date_of_birth))
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_age_minimum;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_age_minimum 
CHECK (
  date_of_birth IS NULL OR 
  EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth)) >= 18
);

-- Create an index on age_verified_at for queries that check if age was verified
CREATE INDEX IF NOT EXISTS idx_profiles_age_verified_at 
ON public.profiles(age_verified_at) 
WHERE age_verified_at IS NOT NULL;

-- Create a function to validate age is 18+
CREATE OR REPLACE FUNCTION public.validate_age_18_plus(p_date_of_birth DATE)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_date_of_birth IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, p_date_of_birth)) >= 18;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Revoke and grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.validate_age_18_plus(DATE) TO authenticated;
