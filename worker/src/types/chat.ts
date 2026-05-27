import { z } from "zod";
import type OpenAI from "openai";

// Messages from clients aren't fully validated — they pass through to OpenAI which
// has its own format. We only validate the top-level envelope.
export const chatRequestSchema = z.object({
  messages: z.array(z.any()).default([]),
  analyticsMode: z.boolean().optional(),
});

export type ChatRequestBody = {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  analyticsMode?: boolean;
};
