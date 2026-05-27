import { META_API_BASE } from "../../constants/whatsapp";
import type { WhatsAppButton } from "../../types/whatsapp";

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
  return `${META_API_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

export async function sendTextMessage(
  to: string,
  text: string,
  env: WhatsAppEnv,
) {
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

export async function sendTemplateVerification(
  to: string,
  userId: string,
  templateName: string,
  env: WhatsAppEnv,
) {
  await fetch(messagesUrl(env), {
    method: "POST",
    headers: buildAuthHeaders(env),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: [
          {
            type: "button",
            sub_type: "quick_reply",
            index: "0",
            parameters: [{ type: "payload", payload: `verify_${userId}` }],
          },
        ],
      },
    }),
  });
}

export async function downloadMetaMedia(
  mediaId: string,
  env: WhatsAppEnv,
): Promise<{ data: ArrayBuffer; mimeType: string }> {
  const metaRes = await fetch(`${META_API_BASE}/${mediaId}`, {
    headers: buildAuthHeaders(env),
  });
  const { url, mime_type } = (await metaRes.json()) as {
    url: string;
    mime_type: string;
  };
  const fileRes = await fetch(url, { headers: buildAuthHeaders(env) });
  return { data: await fileRes.arrayBuffer(), mimeType: mime_type };
}
