import { supabase } from "./supabaseClient";
import type { Database } from "./supabase";

export type SessionInfo = {
  session_id: string;
  code: string;
  state: "lobby" | "live" | "ended";
  role?: "gm" | "player";
};

export type CardColor = "blue" | "red" | "orange" | "black";

type BingoSession = Database['public']['Tables']['bingo_sessions']['Row'];
type BingoCard = Database['public']['Tables']['bingo_cards']['Row'];
type BingoPlayer = Database['public']['Tables']['bingo_players']['Row'];

export const CARD_COLORS: CardColor[] = ["blue", "red", "orange", "black"];

export async function rpcCreateSession(title: string): Promise<SessionInfo> {
  const { data, error } = await supabase.rpc("create_bingo_session", { p_title: title });
  if (error) throw error;
  return data[0] as SessionInfo;
}

export async function rpcJoinSession(code: string, nickname: string) {
  const { data, error } = await supabase.rpc("join_bingo_session", {
    p_code: code,
    p_nickname: nickname,
  });
  if (error) throw error;

  return data[0] as {
    session_id: string;
    session_code: string;
    state: "lobby" | "live" | "ended";
    role: "gm" | "player";
  };
}

export async function rpcCreateMyCard(code: string): Promise<{ card_id: string }> {
  const { data, error } = await supabase.rpc("create_my_card", { p_code: code });
  if (error) throw error;
  return data[0];
}

export async function rpcDrawRandomNumber(code: string): Promise<{ number: number; drawn_at: string }> {
  const { data, error } = await supabase.rpc("draw_random_number", { p_code: code });
  if (error) throw error;
  return data[0];
}

export async function fetchSessionByCode(code: string): Promise<Pick<BingoSession, 'id' | 'code' | 'title' | 'state'>> {
  const { data, error } = await supabase
    .from("bingo_sessions")
    .select("id, code, title, state")
    .eq("code", code.toUpperCase())
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMyCard(sessionId: string): Promise<{ id: string; grid: number[][]; color: CardColor }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from("bingo_cards")
    .select("id, grid, color")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (error) throw error;

  const card = data as BingoCard;
  return { id: card.id, grid: card.grid as number[][], color: (card.color as CardColor) || "blue" };
}

export async function fetchParticipantCards(sessionId: string): Promise<
  { user_id: string; card_id: string; grid: number[][]; color: CardColor }[]
> {
  const { data, error } = await supabase
    .from("bingo_cards")
    .select("user_id, id, grid, color")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data.map((card) => ({
    user_id: card.user_id,
    card_id: card.id,
    grid: card.grid as number[][],
    color: (card.color as CardColor) || "blue",
  }));
}

export async function fetchDrawHistory(sessionId: string): Promise<{ number: number; drawn_at: string }[]> {
  const { data, error } = await supabase
    .from("bingo_draws")
    .select("number, drawn_at")
    .eq("session_id", sessionId)
    .order("drawn_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function rpcEndSession(code: string): Promise<void> {
  const { error } = await supabase.rpc("end_bingo_session", { p_code: code });
  if (error) throw error;
}

export async function rpcStartNextSession(oldCode: string, newTitle: string): Promise<{ new_session_id: string; new_code: string }> {
  const { data, error } = await supabase.rpc("start_next_session", {
    p_old_code: oldCode,
    p_new_title: newTitle,
  });
  if (error) throw error;
  return data[0];
}

export async function fetchParticipants(sessionId: string): Promise<
  Pick<BingoPlayer, 'user_id' | 'nickname' | 'role' | 'created_at'>[]
> {
  const { data, error } = await supabase
    .from("bingo_players")
    .select("user_id, nickname, role, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Pick<BingoPlayer, 'user_id' | 'nickname' | 'role' | 'created_at'>[];
}

export type WinningRules = {
  singleLine: boolean;
  twoLines: boolean;
  fullHouse: boolean;
  fourCorners: boolean;
  diagonal: boolean;
  xPattern: boolean;
  plusPattern: boolean;
  customNumbers: string;
};

export async function rpcUpdateWinningRules(code: string, rules: WinningRules): Promise<void> {
  const { error } = await supabase.rpc("update_winning_rules", {
    p_code: code,
    p_rules: rules,
  });
  if (error) throw error;
}

export async function fetchWinningRules(sessionId: string): Promise<WinningRules | null> {
  const { data, error } = await supabase
    .from("bingo_sessions")
    .select("winning_rules")
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return (data?.winning_rules as WinningRules) || null;
}

export async function rpcClaimWin(code: string, patternType: string): Promise<{ winner_id: string; is_first_winner: boolean; total_winners: number }> {
  // @ts-expect-error - RPC function not in auto-generated types yet
  const { data, error } = await supabase.rpc("claim_bingo_win", {
    p_code: code,
    p_pattern_type: patternType,
  });
  if (error) throw error;
  return data as unknown as { winner_id: string; is_first_winner: boolean; total_winners: number };
}

export async function fetchSessionWinners(sessionId: string): Promise<
  { user_id: string; nickname: string; pattern_type: string; claimed_at: string }[]
> {
  // @ts-expect-error - RPC function not in auto-generated types yet
  const { data, error } = await supabase.rpc("get_session_winners", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return (data as unknown as { user_id: string; nickname: string; pattern_type: string; claimed_at: string }[]) || [];
}
