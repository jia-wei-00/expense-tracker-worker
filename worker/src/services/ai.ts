import OpenAI from "openai";
import {
  AI_MODEL,
  AI_PROVIDER,
  GEMINI_BASE_URL,
  GEMINI_MODEL,
  OPENROUTER_BASE_URL,
} from "../constants/ai";
import type { Env } from "../env";

export function resolveAIConfig(env: Env): { client: OpenAI; model: string } {
  if (env.AI_PROVIDER === AI_PROVIDER.GEMINI) {
    return {
      client: new OpenAI({
        baseURL: GEMINI_BASE_URL,
        apiKey: env.GEMINI_API_KEY,
      }),
      model: GEMINI_MODEL,
    };
  }
  return {
    client: new OpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey: env.OPENROUTER_API_KEY,
    }),
    model: AI_MODEL,
  };
}
