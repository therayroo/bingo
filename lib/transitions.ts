import { supabase } from "./supabaseClient";

export function subscribeToSessionTransition(
  oldSessionId: string,
  onTransition: (row: { new_session_id: string }) => void
) {
  const channel = supabase
    .channel(`bingo_transition:${oldSessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bingo_session_transitions",
        filter: `old_session_id=eq.${oldSessionId}`,
      },
      (payload) => {
        const row = payload.new as { new_session_id: string; old_session_id: string };
        onTransition({ new_session_id: row.new_session_id });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
