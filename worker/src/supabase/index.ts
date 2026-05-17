import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(url: string, anonKey: string, accessToken: string) {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
