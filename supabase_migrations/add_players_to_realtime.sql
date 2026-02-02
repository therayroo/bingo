-- Add bingo_players and bingo_sessions tables to realtime publication
-- This enables real-time updates when participants join and when session state changes

ALTER PUBLICATION supabase_realtime ADD TABLE bingo_players;
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_sessions;
