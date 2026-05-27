import type { Env } from "../env";
import { DB_TABLE } from "../constants/db";
import { jsonResponse } from "../lib/http";
import { authenticateRequest } from "../services/auth";
import { createServiceClient } from "../services/supabase";
import { sendTemplateVerification } from "../services/whatsapp/api";

export async function handleWhatsAppResend(
  req: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, cors);
  }

  try {
    const auth = await authenticateRequest(req, env);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status, cors);

    const serviceSupabase = createServiceClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: existing } = await serviceSupabase
      .from(DB_TABLE.WHATSAPP_USERS)
      .select("phone_number, is_verified")
      .eq("user_id", auth.user.id)
      .single();

    if (!existing) {
      return jsonResponse({ error: "No phone number linked" }, 404, cors);
    }
    if (existing.is_verified) {
      return jsonResponse({ error: "Number is already verified" }, 409, cors);
    }

    await sendTemplateVerification(
      existing.phone_number,
      auth.user.id,
      env.WHATSAPP_TEMPLATE_NAME,
      env,
    );

    return jsonResponse({ message: "Verification resent" }, 200, cors);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500, cors);
  }
}
