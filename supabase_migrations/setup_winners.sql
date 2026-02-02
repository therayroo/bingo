-- Create winners table
CREATE TABLE IF NOT EXISTS bingo_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  nickname text NOT NULL,
  pattern_type text NOT NULL, -- e.g., 'singleLine', 'fullHouse', etc.
  claimed_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id, pattern_type) -- Prevent duplicate claims
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_winners_session ON bingo_winners(session_id);
CREATE INDEX IF NOT EXISTS idx_winners_user ON bingo_winners(user_id);

-- RLS Policies
ALTER TABLE bingo_winners ENABLE ROW LEVEL SECURITY;

-- Everyone can see winners
CREATE POLICY "winners_select_all"
  ON bingo_winners FOR SELECT
  USING (true);

-- Only authenticated users can claim wins (server-side validation)
CREATE POLICY "winners_insert_auth"
  ON bingo_winners FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_winners;

-- RPC function to claim a win
CREATE OR REPLACE FUNCTION claim_bingo_win(
  p_code text,
  p_pattern_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_user_id text;
  v_nickname text;
  v_winner_id uuid;
  v_is_first_winner boolean;
  v_total_winners integer;
BEGIN
  -- Get current user
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get session
  SELECT id INTO v_session_id
  FROM bingo_sessions
  WHERE UPPER(code) = UPPER(p_code);

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Get user's nickname
  SELECT nickname INTO v_nickname
  FROM bingo_players
  WHERE session_id = v_session_id
    AND user_id = v_user_id;

  IF v_nickname IS NULL THEN
    RAISE EXCEPTION 'Player not found in session';
  END IF;

  -- Insert winner (will fail if duplicate due to UNIQUE constraint)
  BEGIN
    INSERT INTO bingo_winners (session_id, user_id, nickname, pattern_type)
    VALUES (v_session_id, v_user_id, v_nickname, p_pattern_type)
    RETURNING id INTO v_winner_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Already claimed this pattern';
  END;

  -- Check if this is the first winner for this session
  SELECT COUNT(*) = 1 INTO v_is_first_winner
  FROM bingo_winners
  WHERE session_id = v_session_id;

  -- Get total winners
  SELECT COUNT(*) INTO v_total_winners
  FROM bingo_winners
  WHERE session_id = v_session_id;

  RETURN json_build_object(
    'winner_id', v_winner_id,
    'is_first_winner', v_is_first_winner,
    'total_winners', v_total_winners
  );
END;
$$;

-- RPC function to get all winners for a session
CREATE OR REPLACE FUNCTION get_session_winners(p_session_id uuid)
RETURNS TABLE (
  user_id text,
  nickname text,
  pattern_type text,
  claimed_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT user_id, nickname, pattern_type, claimed_at
  FROM bingo_winners
  WHERE session_id = p_session_id
  ORDER BY claimed_at ASC;
$$;
