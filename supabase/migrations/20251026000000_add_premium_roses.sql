-- Add special_match_type column to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS special_match_type TEXT;

-- Add comment
COMMENT ON COLUMN matches.special_match_type IS 'Type of special match (e.g., premium_roses for VIP instant matches)';

-- Create index for special matches
CREATE INDEX IF NOT EXISTS idx_matches_special_type ON matches(special_match_type) WHERE special_match_type IS NOT NULL;
