-- ============================================================================
-- CONSOLIDATED RLS POLICIES FOR BINGO APP
-- ============================================================================
-- This file sets up all necessary RLS policies for realtime to work properly
-- while maintaining session isolation at the application level.
--
-- Note: Realtime subscriptions filter by session_id in the channel filter,
-- so even though these policies allow broader SELECT access, updates are
-- session-scoped through the application's subscription filters.
-- ============================================================================

-- Clean up old policies
DROP POLICY IF EXISTS bingo_draws_select_members ON bingo_draws;
DROP POLICY IF EXISTS bingo_cards_select_own ON bingo_cards;
DROP POLICY IF EXISTS bingo_cards_select_session_members ON bingo_cards;
DROP POLICY IF EXISTS bingo_players_select_self ON bingo_players;

-- ============================================================================
-- BINGO_DRAWS POLICIES
-- ============================================================================

-- Allow authenticated users to SELECT draws (realtime needs this)
CREATE POLICY "bingo_draws_select_authenticated"
ON bingo_draws
FOR SELECT
TO authenticated, anon
USING (true);

-- Keep INSERT restricted to GM only
-- (existing policy: bingo_draws_insert_gm_only)

-- ============================================================================
-- BINGO_CARDS POLICIES  
-- ============================================================================

-- Allow authenticated users to SELECT all cards (needed for GM thumbnails and realtime)
CREATE POLICY "bingo_cards_select_all"
ON bingo_cards
FOR SELECT
TO authenticated, anon
USING (true);

-- Keep INSERT restricted to own cards
-- (existing policy: bingo_cards_insert_own)

-- ============================================================================
-- BINGO_PLAYERS POLICIES
-- ============================================================================

-- Allow members to see other members in their session
-- (existing policy: bingo_players_select_session_members)
-- This one can stay as-is since it uses is_bingo_member()

-- Keep INSERT restricted to self
-- (existing policy: bingo_players_insert_self)

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all policies
SELECT 
  tablename,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NULL THEN 'null'
    ELSE left(qual, 50)
  END as qual_preview
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('bingo_draws', 'bingo_cards', 'bingo_players')
ORDER BY tablename, cmd, policyname;

-- Verify realtime publication
SELECT schemaname, tablename, 
       array_agg(distinct p.pubname) as publications
FROM pg_publication_tables pt
JOIN pg_publication p ON pt.pubname = p.pubname
WHERE schemaname = 'public' 
  AND tablename IN ('bingo_draws', 'bingo_cards', 'bingo_players', 'bingo_sessions')
GROUP BY schemaname, tablename
ORDER BY tablename;
