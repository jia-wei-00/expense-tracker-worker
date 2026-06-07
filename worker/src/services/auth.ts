import type { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/services/supabase";
import type { Env } from "@/env";

export type AuthResult =
  | { ok: true; user: User; accessToken: string }
  | { ok: false; status: 401; error: string };

/**
 * Validate a Bearer token from the Authorization header and return the
 * authenticated Supabase user.
 */
export async function authenticateRequest(
  req: Request,
  env: Env,
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const accessToken = authHeader.slice("Bearer ".length);
  const supabase = createSupabaseClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    accessToken,
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true, user, accessToken };
}
