import type OpenAI from "openai";

export interface Category {
  id: number;
  name: string;
  is_expense: boolean;
}

export interface AddExpenseArgs {
  name: string;
  amount: number;
  category: number;
  is_expense: boolean;
  spend_date: string;
}

export interface DeleteExpenseArgs {
  id: number;
}

export type PendingAction =
  | { toolName: "addExpense"; args: AddExpenseArgs }
  | { toolName: "deleteExpense"; args: DeleteExpenseArgs };

export interface ChatRequestBody {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  analyticsMode?: boolean;
}

// Meta WhatsApp Cloud API webhook payload shape
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
export interface MetaWebhookMessage {
  from: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
  };
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
