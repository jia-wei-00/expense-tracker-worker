import { ChatOpenAI } from "@langchain/openai";
import {
  AI_MODEL,
  AI_PROVIDER,
  GEMINI_BASE_URL,
  GEMINI_MODEL,
  OPENROUTER_BASE_URL,
} from "@/constants/ai";
import type { Env } from "@/env";

export function resolveChatModel(env: Env): ChatOpenAI {
  if (env.AI_PROVIDER === AI_PROVIDER.GEMINI) {
    return new ChatOpenAI({
      apiKey: env.GEMINI_API_KEY,
      model: GEMINI_MODEL,
      configuration: { baseURL: GEMINI_BASE_URL },
    });
  }
  return new ChatOpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    model: AI_MODEL,
    configuration: { baseURL: OPENROUTER_BASE_URL },
  });
}
