import { supabase } from "./supabaseClient";
import type { Database } from "./supabase";

type BingoDrawRow = Database['public']['Tables']['bingo_draws']['Row'];
type BingoCardRow = Database['public']['Tables']['bingo_cards']['Row'];
type BingoSessionRow = Database['public']['Tables']['bingo_sessions']['Row'];

export function subscribeToDraws(
  sessionId: string,
  onDraw: (row: { number: number; drawn_at: string }) => void
) {
  console.log('[subscribeToDraws] Setting up subscription for session:', sessionId);
  const channelName = `draws_${sessionId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bingo_draws",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        console.log('[subscribeToDraws] Received payload:', payload);
        const row = payload.new as BingoDrawRow;
        onDraw({ number: row.number, drawn_at: row.drawn_at });
      }
    )
    .subscribe((status, err) => {
      console.log('[subscribeToDraws] Subscription status:', status, 'error:', err);
    });

  return () => {
    console.log('[subscribeToDraws] Unsubscribing from session:', sessionId);
    supabase.removeChannel(channel);
  };
}

export function subscribeToCards(
  sessionId: string,
  onCardInsert: (card: { user_id: string; card_id: string; grid: number[][]; color: string }) => void
) {
  const channelName = `cards_${sessionId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bingo_cards",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        const row = payload.new as BingoCardRow;
        onCardInsert({
          user_id: row.user_id,
          card_id: row.id,
          grid: row.grid as number[][],
          color: row.color || "blue",
        });
      }
    )
    .subscribe((status, err) => {
      console.log('[subscribeToCards] Subscription status:', status, 'error:', err);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToSessionState(
  sessionId: string,
  onStateChange: (state: string) => void
) {
  const channelName = `session_state_${sessionId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "bingo_sessions",
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        const row = payload.new as BingoSessionRow;
        onStateChange(row.state);
      }
    )
    .subscribe((status, err) => {
      console.log('[subscribeToSessionState] Subscription status:', status, 'error:', err);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToWinners(
  sessionId: string,
  onWinner: (winner: { user_id: string; pattern_type: string; claimed_at: string }) => void
) {
  const channelName = `winners_${sessionId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bingo_winners",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        const row = payload.new as { user_id: string; pattern_type: string; claimed_at: string };
        onWinner({ user_id: row.user_id, pattern_type: row.pattern_type, claimed_at: row.claimed_at });
      }
    )
    .subscribe((status, err) => {
      console.log('[subscribeToWinners] Subscription status:', status, 'error:', err);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
