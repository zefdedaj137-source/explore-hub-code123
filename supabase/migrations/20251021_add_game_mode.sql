-- Add game_mode column to game_invites table
ALTER TABLE game_invites ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'history' CHECK (game_mode IN ('history', 'music', 'dance'));

-- Update existing invites to have 'history' mode
UPDATE game_invites SET game_mode = 'history' WHERE game_mode IS NULL;
