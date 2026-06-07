import type { Env } from "@/env";
import { corsHeaders, jsonResponse } from "@/lib/http";
import { handleChat } from "@/routes/chat";
import { handleWhatsAppLink } from "@/routes/whatsapp-link";
import { handleWhatsAppResend } from "@/routes/whatsapp-resend";
import { handleWhatsAppWebhook } from "@/routes/whatsapp-webhook";

export type { Env } from "@/env";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("Origin") ?? "*";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN || "*");

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const { pathname } = new URL(req.url);

    switch (pathname) {
      case "/whatsapp":
        return handleWhatsAppWebhook(req, env, cors);
      case "/whatsapp/link":
        return handleWhatsAppLink(req, env, cors);
      case "/whatsapp/resend-verification":
        return handleWhatsAppResend(req, env, cors);
      case "/chat":
        return handleChat(req, env, cors);
      default:
        return jsonResponse({ error: "Not found" }, 404, cors);
    }
  },
};
