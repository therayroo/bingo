-- ============================================================================
-- WINNER DETECTION AND MANAGEMENT
-- ============================================================================
-- Add table to track winners and RPC function to check/report wins
-- ============================================================================

-- Create winners table
CREATE TABLE IF NOT EXISTS bingo_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES bingo_cards(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'singleLine', 'twoLines', 'fullHouse', etc.
  won_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified BOOLEAN DEFAULT false,
  UNIQUE(session_id, user_id, pattern_type)
);

-- Enable RLS
ALTER TABLE bingo_winners ENABLE ROW LEVEL SECURITY;

-- Allow anyone to see winners in their session
CREATE POLICY "bingo_winners_select_all"
ON bingo_winners
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow users to insert their own wins
CREATE POLICY "bingo_winners_insert_own"
ON bingo_winners
FOR INSERT
TO authenticated, anon
WITH CHECK (user_id = auth.uid());

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_winners;

-- Create RPC function to claim a win
CREATE OR REPLACE FUNCTION claim_bingo_win(
  p_code TEXT,
  p_pattern_type TEXT
)
RETURNS TABLE(
  winner_id UUID,
  is_first_winner BOOLEAN,
  total_winners INTEGER
) AS $$
DECLARE
  v_uid UUID;
  v_session bingo_sessions%ROWTYPE;
  v_card_id UUID;
  v_winner_id UUID;
  v_existing_winners INTEGER;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get session
  SELECT * INTO v_session
  FROM bingo_sessions
  WHERE code = upper(trim(p_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.state != 'live' THEN
    RAISE EXCEPTION 'Session is not live';
  END IF;

  -- Get user's card
  SELECT id INTO v_card_id
  FROM bingo_cards
  WHERE session_id = v_session.id
    AND user_id = v_uid
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found';
  END IF;

  -- Check if already claimed this pattern
  SELECT COUNT(*) INTO v_existing_winners
  FROM bingo_winners
  WHERE session_id = v_session.id
    AND pattern_type = p_pattern_type;

  -- Insert the win
  INSERT INTO bingo_winners (session_id, user_id, card_id, pattern_type)
  VALUES (v_session.id, v_uid, v_card_id, p_pattern_type)
  ON CONFLICT (session_id, user_id, pattern_type) DO NOTHING
  RETURNING id INTO v_winner_id;

  IF v_winner_id IS NULL THEN
    RAISE EXCEPTION 'Win already claimed';
  END IF;

  -- Return result
  RETURN QUERY
  SELECT 
    v_winner_id,
    v_existing_winners = 0,
    (SELECT COUNT(DISTINCT user_id)::INTEGER 
     FROM bingo_winners 
     WHERE session_id = v_session.id 
       AND pattern_type = p_pattern_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get winners for a session
CREATE OR REPLACE FUNCTION get_session_winners(p_session_id UUID)
RETURNS TABLE(
  user_id UUID,
  nickname TEXT,
  pattern_type TEXT,
  won_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.user_id,
    p.nickname,
    w.pattern_type,
    w.won_at
  FROM bingo_winners w
  JOIN bingo_players p ON p.user_id = w.user_id AND p.session_id = w.session_id
  WHERE w.session_id = p_session_id
  ORDER BY w.won_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT tablename, array_agg(distinct p.pubname) as publications
FROM pg_publication_tables pt
JOIN pg_publication p ON pt.pubname = p.pubname
WHERE tablename = 'bingo_winners'
GROUP BY tablename;
