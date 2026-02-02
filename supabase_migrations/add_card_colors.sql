-- Add color column to bingo_cards table
ALTER TABLE bingo_cards
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'blue';

-- Update existing cards to have colors based on their creation order
DO $$
DECLARE
  card_record RECORD;
  card_index INTEGER;
  colors TEXT[] := ARRAY['blue', 'red', 'orange', 'black'];
BEGIN
  FOR card_record IN 
    SELECT id, session_id, created_at 
    FROM bingo_cards 
    ORDER BY session_id, created_at
  LOOP
    -- Get the index within the session
    SELECT COUNT(*) - 1 INTO card_index
    FROM bingo_cards
    WHERE session_id = card_record.session_id 
      AND created_at <= card_record.created_at;
    
    -- Assign color based on index
    UPDATE bingo_cards
    SET color = colors[(card_index % 4) + 1]
    WHERE id = card_record.id;
  END LOOP;
END $$;

-- Update the create_my_card function to assign colors
CREATE OR REPLACE FUNCTION create_my_card(p_code TEXT)
RETURNS TABLE(card_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_user_id UUID;
  v_existing_card_id UUID;
  v_new_card_id UUID;
  v_grid JSONB;
  v_card_count INTEGER;
  v_colors TEXT[] := ARRAY['blue', 'red', 'orange', 'black'];
  v_color TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_session_id
  FROM bingo_sessions
  WHERE code = UPPER(p_code);

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Check if user already has a card
  SELECT id INTO v_existing_card_id
  FROM bingo_cards
  WHERE session_id = v_session_id
    AND user_id = v_user_id;

  IF v_existing_card_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_card_id;
    RETURN;
  END IF;

  -- Count existing cards to determine color
  SELECT COUNT(*) INTO v_card_count
  FROM bingo_cards
  WHERE session_id = v_session_id;

  -- Assign color based on card count
  v_color := v_colors[(v_card_count % 4) + 1];

  -- Generate a random bingo card grid
  v_grid := (
    SELECT jsonb_agg(
      jsonb_agg(num ORDER BY col_idx)
    )
    FROM (
      SELECT 
        row_idx,
        col_idx,
        CASE 
          WHEN row_idx = 2 AND col_idx = 2 THEN 0  -- FREE space
          ELSE (
            SELECT n
            FROM (
              SELECT generate_series(
                CASE col_idx
                  WHEN 0 THEN 1
                  WHEN 1 THEN 16
                  WHEN 2 THEN 31
                  WHEN 3 THEN 46
                  WHEN 4 THEN 61
                END,
                CASE col_idx
                  WHEN 0 THEN 15
                  WHEN 1 THEN 30
                  WHEN 2 THEN 45
                  WHEN 3 THEN 60
                  WHEN 4 THEN 75
                END
              ) AS n
              ORDER BY random()
              LIMIT 5
            ) sub
            ORDER BY random()
            LIMIT 1
          )
        END AS num
      FROM generate_series(0, 4) AS row_idx
      CROSS JOIN generate_series(0, 4) AS col_idx
    ) nums
    GROUP BY row_idx
    ORDER BY row_idx
  );

  INSERT INTO bingo_cards (session_id, user_id, grid, color)
  VALUES (v_session_id, v_user_id, v_grid, v_color)
  RETURNING id INTO v_new_card_id;

  RETURN QUERY SELECT v_new_card_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_my_card(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_my_card(TEXT) TO anon;
