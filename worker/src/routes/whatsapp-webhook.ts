import type { Env } from "../env";
import { jsonResponse } from "../lib/http";
import {
  handleWhatsAppMessage,
  handleWhatsAppVerification,
} from "../services/whatsapp/handler";

export async function handleWhatsAppWebhook(
  req: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  if (req.method === "GET") return handleWhatsAppVerification(req, env);
  if (req.method === "POST") return handleWhatsAppMessage(req, env);
  return jsonResponse({ error: "Method not allowed" }, 405, cors);
}
