import type { Env } from "@/env";
import { DB_TABLE } from "@/constants/db";
import { jsonResponse } from "@/lib/http";
import { authenticateRequest } from "@/services/auth";
import { createServiceClient } from "@/services/supabase";
import { sendTemplateVerification } from "@/services/whatsapp/api";
import { linkPhoneRequestSchema } from "@/types/whatsapp";

export async function handleWhatsAppLink(
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

    const rawBody = await req.json();
    const parseResult = linkPhoneRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return jsonResponse(
        { error: parseResult.error.issues[0]?.message ?? "Invalid request body" },
        400,
        cors,
      );
    }

    const phoneNumber = parseResult.data.phoneNumber.replace(/\D/g, "");
    if (!phoneNumber) {
      return jsonResponse({ error: "phoneNumber is required" }, 400, cors);
    }

    const serviceSupabase = createServiceClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );

    await serviceSupabase
      .from(DB_TABLE.WHATSAPP_USERS)
      .delete()
      .eq("user_id", auth.user.id);

    const { error: insertError } = await serviceSupabase
      .from(DB_TABLE.WHATSAPP_USERS)
      .insert({
        phone_number: phoneNumber,
        user_id: auth.user.id,
        is_verified: false,
      });

    if (insertError) {
      return jsonResponse({ error: "Failed to save number" }, 500, cors);
    }

    await sendTemplateVerification(
      phoneNumber,
      auth.user.id,
      env.WHATSAPP_TEMPLATE_NAME,
      env,
    );

    return jsonResponse({ message: "Verification sent" }, 200, cors);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500, cors);
  }
}
