import { z } from "zod";

// Meta WhatsApp Cloud API webhook payload
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
export interface MetaWebhookMessage {
  from: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
  };
  button?: { text: string; payload: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; caption?: string };
}

export interface MetaWebhookPayload {
  entry: Array<{
    changes: Array<{
      value: {
        messages?: MetaWebhookMessage[];
      };
    }>;
  }>;
}

export interface ParsedWebhookMessage {
  from: string;
  type: "text" | "button_reply" | "audio" | "image" | "other";
  text?: string;
  buttonId?: string;
  mediaId?: string;
  mimeType?: string;
  caption?: string;
}

export interface WhatsAppButton {
  id: string;
  title: string;
}

export const linkPhoneRequestSchema = z.object({
  phoneNumber: z.string().min(1, "phoneNumber is required"),
});

export type LinkPhoneRequest = z.infer<typeof linkPhoneRequestSchema>;
