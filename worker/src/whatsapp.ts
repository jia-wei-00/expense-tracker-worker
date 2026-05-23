import type { MetaWebhookPayload, ParsedWebhookMessage, WhatsAppButton } from "./types";

const WA_API_BASE = "https://graph.facebook.com/v25.0";

export interface WhatsAppEnv {
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
}

function buildAuthHeaders(env: WhatsAppEnv): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
  };
}

function messagesUrl(env: WhatsAppEnv): string {
  return `${WA_API_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

export async function sendTextMessage(to: string, text: string, env: WhatsAppEnv) {
  await fetch(messagesUrl(env), {
    method: "POST",
    headers: buildAuthHeaders(env),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

export async function sendInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: WhatsAppButton[],
  env: WhatsAppEnv,
) {
  await fetch(messagesUrl(env), {
    method: "POST",
    headers: buildAuthHeaders(env),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    }),
  });
}

export async function downloadMetaMedia(
  mediaId: string,
  env: WhatsAppEnv,
): Promise<{ data: ArrayBuffer; mimeType: string }> {
  const metaRes = await fetch(`${WA_API_BASE}/${mediaId}`, { headers: buildAuthHeaders(env) });
  const { url, mime_type } = (await metaRes.json()) as { url: string; mime_type: string };
  const fileRes = await fetch(url, { headers: buildAuthHeaders(env) });
  return { data: await fileRes.arrayBuffer(), mimeType: mime_type };
}

export function parseIncomingWebhook(body: unknown): ParsedWebhookMessage | null {
  try {
    const payload = body as MetaWebhookPayload;
    const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return null;

    const { from } = message;

    if (message.type === "text" && message.text) {
      return { from, type: "text", text: message.text.body };
    }

    if (message.type === "interactive" && message.interactive?.type === "button_reply") {
      const buttonId = message.interactive.button_reply?.id;
      if (buttonId) return { from, type: "button_reply", buttonId };
    }

    if (message.type === "audio" && message.audio) {
      return { from, type: "audio", mediaId: message.audio.id, mimeType: message.audio.mime_type };
    }

    if (message.type === "image" && message.image) {
      return {
        from,
        type: "image",
        mediaId: message.image.id,
        mimeType: message.image.mime_type,
        caption: message.image.caption,
      };
    }

    return { from, type: "other" };
  } catch {
    return null;
  }
}
