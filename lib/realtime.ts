import { supabase } from "./supabaseClient";

type BingoDrawRow = {
  number: number;
  drawn_at: string;
};

type BingoCardRow = {
  id: string;
  user_id: string;
  grid: number[][];
  color: string;
};

type BingoSessionRow = {
  id: string;
  state: string;
};

export function subscribeToDraws(
  sessionId: string,
  onDraw: (row: { number: number; drawn_at: string }) => void
) {
  const channel = supabase
    .channel(`bingo_draws:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bingo_draws",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        const row = payload.new as BingoDrawRow;
        onDraw({ number: row.number, drawn_at: row.drawn_at });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToCards(
  sessionId: string,
  onCardInsert: (card: { user_id: string; card_id: string; grid: number[][]; color: string }) => void
) {
  const channel = supabase
    .channel(`bingo_cards:${sessionId}`)
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
          grid: row.grid,
          color: row.color || "blue",
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToSessionState(
  sessionId: string,
  onStateChange: (state: string) => void
) {
  const channel = supabase
    .channel(`bingo_session_state:${sessionId}`)
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
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
