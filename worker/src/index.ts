import { createSupabaseClient } from "./supabase";
import { promptMessage, tools } from "./tools";
import {
  normalizeAddExpenseArgs,
  formatCategoryList,
  resolveAIConfig,
  isWriteToolName,
} from "./utils";
import {
  handleWhatsAppVerification,
  handleWhatsAppMessage,
} from "./whatsapp-handler";
import {
  MAX_LLM_STEPS,
  DEFAULT_EXPENSE_LIMIT,
  PENDING_CONFIRMATION_REPLY,
  TOOL_NAME,
  DB_TABLE,
} from "./constants";
import type { Category, ChatRequestBody, PendingAction } from "./types";
import OpenAI from "openai";

export interface Env {
  AI_PROVIDER: string;
  OPENROUTER_API_KEY: string;
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGIN: string;
  WHATSAPP_VERIFY_TOKEN: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
}

function corsHeaders(origin: string, allowedOrigin: string) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin || origin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("Origin") ?? "*";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN || "*");

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const { pathname } = new URL(req.url);

    if (pathname === "/whatsapp") {
      if (req.method === "GET") return handleWhatsAppVerification(req, env);
      if (req.method === "POST") return handleWhatsAppMessage(req, env);
      return jsonResponse({ error: "Method not allowed" }, 405, cors);
    }

    if (pathname !== "/chat") {
      return jsonResponse({ error: "Not found" }, 404, cors);
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, cors);
    }

    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401, cors);
      }

      const accessToken = authHeader.slice("Bearer ".length);
      const supabase = createSupabaseClient(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
        accessToken,
      );

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, cors);
      }

      const { data: categories, error: categoriesError } = await supabase
        .from(DB_TABLE.EXPENSE_CATEGORY)
        .select("id, name, is_expense")
        .order("name");

      if (categoriesError) {
        console.error("Failed to fetch categories:", categoriesError.message);
        return jsonResponse({ error: "Failed to load categories" }, 500, cors);
      }

      const categoryText = formatCategoryList((categories ?? []) as Category[]);
      const { messages: rawMessages, analyticsMode } =
        (await req.json()) as ChatRequestBody;
      const history = (rawMessages ??
        []) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

      const analyticsSystemPrompt = `You are a financial advisor AI for ${user.email}. Analyze their expense data and respond in well-structured Markdown. Use headings, bullet points, and bold text where appropriate. Give 3-4 specific, actionable tips to optimize spending and save money. Be concise, direct, and encouraging. Currency is MYR.`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        analyticsMode
          ? [{ role: "system", content: analyticsSystemPrompt }, ...history]
          : promptMessage({ email: user.email ?? "", categoryText, history });

      const { client: openai, model } = resolveAIConfig(env);
      let lastResponseText: string | null = null;

      for (let step = 0; step < MAX_LLM_STEPS; step++) {
        const response = await openai.chat.completions.create({
          model,
          messages,
          tools: analyticsMode ? undefined : tools,
        });

        const msg = response.choices[0].message;
        messages.push(msg);
        lastResponseText = typeof msg.content === "string" ? msg.content : null;

        if (!msg.tool_calls?.length) break;

        const pendingWriteToolCalls: PendingAction[] = [];
        const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] =
          [];

        for (const tc of msg.tool_calls) {
          const args = JSON.parse(tc.function.arguments ?? "{}") as Record<
            string,
            unknown
          >;

          if (isWriteToolName(tc.function.name)) {
            if (tc.function.name === TOOL_NAME.ADD_EXPENSE) {
              pendingWriteToolCalls.push({
                toolName: tc.function.name,
                args: normalizeAddExpenseArgs(args),
              });
            } else {
              pendingWriteToolCalls.push({
                toolName: tc.function.name,
                args: { id: Number(args.id) },
              });
            }
            toolResults.push({
              role: "tool",
              tool_call_id: tc.id,
              content: PENDING_CONFIRMATION_REPLY,
            });
          } else if (tc.function.name === TOOL_NAME.LIST_EXPENSES) {
            let query = supabase
              .from(DB_TABLE.EXPENSE)
              .select(
                "id, name, amount, spend_date, is_expense, expense_category(name)",
              )
              .order("spend_date", { ascending: false })
              .limit(Number(args.limit ?? DEFAULT_EXPENSE_LIMIT));

            if (args.category)
              query = query.eq("category", Number(args.category));
            if (args.from) query = query.gte("spend_date", String(args.from));
            if (args.to) query = query.lte("spend_date", String(args.to));

            const { data, error } = await query;
            toolResults.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(error ? { error: error.message } : data),
            });
          }
        }

        if (pendingWriteToolCalls.length > 0) {
          return jsonResponse(
            { message: null, pendingToolCalls: pendingWriteToolCalls },
            200,
            cors,
          );
        }

        messages.push(...toolResults);
      }

      return jsonResponse(
        { message: lastResponseText, pendingToolCalls: null },
        200,
        cors,
      );
    } catch (err) {
      if (err instanceof OpenAI.RateLimitError) {
        return jsonResponse({ error: "AI rate limit reached. Please try again in a moment." }, 429, cors);
      }
      console.error(err);
      return jsonResponse({ error: "Internal server error" }, 500, cors);
    }
  },
};
