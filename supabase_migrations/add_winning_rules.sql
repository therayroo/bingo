-- Add winning_rules column to bingo_sessions table
ALTER TABLE bingo_sessions
ADD COLUMN IF NOT EXISTS winning_rules JSONB DEFAULT '{
  "singleLine": true,
  "twoLines": false,
  "fullHouse": false,
  "fourCorners": false,
  "diagonal": false,
  "xPattern": false,
  "plusPattern": false,
  "customNumbers": ""
}'::jsonb;

-- Create RPC function to update winning rules
CREATE OR REPLACE FUNCTION update_winning_rules(
  p_code TEXT,
  p_rules JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_gm_user_id UUID;
  v_state TEXT;
BEGIN
  -- Get current user
  v_gm_user_id := auth.uid();
  
  IF v_gm_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find session and verify user is the GM
  SELECT id, state INTO v_session_id, v_state
  FROM bingo_sessions
  WHERE code = UPPER(p_code)
    AND gm_user_id = v_gm_user_id;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found or you are not the GM';
  END IF;

  -- Only allow updating winning rules in lobby state
  IF v_state != 'lobby' THEN
    RAISE EXCEPTION 'Cannot change winning rules after session has started';
  END IF;

  -- Update winning rules
  UPDATE bingo_sessions
  SET winning_rules = p_rules
  WHERE id = v_session_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_winning_rules(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_winning_rules(TEXT, JSONB) TO anon;
