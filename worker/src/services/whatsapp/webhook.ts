import type {
  MetaWebhookPayload,
  ParsedWebhookMessage,
} from "@/types/whatsapp";

export async function verifyMetaSignature(
  rawBody: ArrayBuffer,
  signature: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signature?.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const hexSignature = signature.slice("sha256=".length);
  const sigBytes = new Uint8Array(
    hexSignature.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
  );
  return crypto.subtle.verify("HMAC", key, sigBytes, rawBody);
}

export function parseIncomingWebhook(
  body: unknown,
): ParsedWebhookMessage | null {
  try {
    const payload = body as MetaWebhookPayload;
    const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return null;

    const { from } = message;

    if (message.type === "text" && message.text) {
      return { from, type: "text", text: message.text.body };
    }

    if (
      message.type === "interactive" &&
      message.interactive?.type === "button_reply"
    ) {
      const buttonId = message.interactive.button_reply?.id;
      if (buttonId) return { from, type: "button_reply", buttonId };
    }

    if (message.type === "button" && message.button?.payload) {
      return { from, type: "button_reply", buttonId: message.button.payload };
    }

    if (message.type === "audio" && message.audio) {
      return {
        from,
        type: "audio",
        mediaId: message.audio.id,
        mimeType: message.audio.mime_type,
      };
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
