import { supabase } from "./supabaseClient";

export async function ensureAnonymousAuth(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    supabase.realtime.setAuth(data.session.access_token);
    return;
  }

  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;

  const token = signInData.session?.access_token ?? "";
  supabase.realtime.setAuth(token);
}
