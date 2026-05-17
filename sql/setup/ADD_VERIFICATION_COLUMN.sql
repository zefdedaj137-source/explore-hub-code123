-- ============================================
-- ADD VERIFICATION_SELFIE_URL COLUMN
-- ============================================
-- 
-- Quick fix for missing verification_selfie_url column
-- Execute this in your Supabase SQL Editor
-- ============================================

-- Add verification selfie column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_selfie_url TEXT;

-- Add comment
COMMENT ON COLUMN public.profiles.verification_selfie_url IS 'URL to verification selfie photo for account verification';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ VERIFICATION_SELFIE_URL COLUMN ADDED!';
    RAISE NOTICE '📱 Profile verification feature is now ready!';
END $$;