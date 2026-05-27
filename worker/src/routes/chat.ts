import OpenAI from "openai";
import type { Env } from "../env";
import { DB_TABLE } from "../constants/db";
import { buildAgentPrompt, buildAnalyticsPrompt } from "../ai/prompts";
import { jsonResponse } from "../lib/http";
import { formatCategoryList } from "../lib/parsers";
import { resolveAIConfig } from "../services/ai";
import { runAgentLoop } from "../services/agent";
import { authenticateRequest } from "../services/auth";
import { createSupabaseClient } from "../services/supabase";
import { chatRequestSchema } from "../types/chat";
import type { Category } from "../types/expense";

export async function handleChat(
  req: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, cors);
  }

  try {
    const auth = await authenticateRequest(req, env);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status, cors);

    const supabase = createSupabaseClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      auth.accessToken,
    );

    const { data: categories, error: categoriesError } = await supabase
      .from(DB_TABLE.EXPENSE_CATEGORY)
      .select("id, name, is_expense")
      .order("name");

    if (categoriesError) {
      console.error("Failed to fetch categories:", categoriesError.message);
      return jsonResponse({ error: "Failed to load categories" }, 500, cors);
    }

    const rawBody = await req.json();
    const parseResult = chatRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return jsonResponse({ error: "Invalid request body" }, 400, cors);
    }

    const { messages: history, analyticsMode } = parseResult.data;
    const categoryText = formatCategoryList((categories ?? []) as Category[]);
    const email = auth.user.email ?? "";

    const messages = analyticsMode
      ? [
          { role: "system" as const, content: buildAnalyticsPrompt(email) },
          ...(history as OpenAI.Chat.Completions.ChatCompletionMessageParam[]),
        ]
      : buildAgentPrompt({
          email,
          categoryText,
          history: history as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        });

    const { client: openai, model } = resolveAIConfig(env);
    const result = await runAgentLoop({
      openai,
      model,
      messages,
      supabase,
      enableTools: !analyticsMode,
    });

    if (result.pendingActions.length > 0) {
      return jsonResponse(
        { message: null, pendingToolCalls: result.pendingActions },
        200,
        cors,
      );
    }

    return jsonResponse(
      { message: result.text, pendingToolCalls: null },
      200,
      cors,
    );
  } catch (err) {
    if (err instanceof OpenAI.RateLimitError) {
      return jsonResponse(
        { error: "AI rate limit reached. Please try again in a moment." },
        429,
        cors,
      );
    }
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500, cors);
  }
}
