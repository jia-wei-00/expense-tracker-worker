import OpenAI from "openai";
import { createSupabaseClient } from "./supabase";
import { promptMessage, tools } from "./tools";
import { WRITE_TOOLS } from "./write-tools";
import { normalizeAddExpenseArgs } from "./utils";

export interface Env {
  OPENROUTER_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_ORIGIN: string;
}

const corsHeaders = (origin: string, allowed: string) => ({
  "Access-Control-Allow-Origin": allowed || origin,
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

function json(
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
    if (pathname !== "/chat") {
      return json({ error: "Not found" }, 404, cors);
    }
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, cors);
    }

    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return json({ error: "Unauthorized" }, 401, cors);
      }

      const supabase = createSupabaseClient(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
        authHeader.slice(7),
      );

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return json({ error: "Unauthorized" }, 401, cors);
      }

      const { data: categories, error: catError } = await supabase
        .from("expense_category")
        .select("id, name, is_expense")
        .order("name");

      if (catError) {
        console.error("Failed to fetch categories:", catError.message);
        return json({ error: "Failed to load categories" }, 500, cors);
      }

      const categoryText = (categories ?? [])
        .map(
          (c: { id: number; name: string; is_expense: boolean }) =>
            `  - id: ${c.id}, name: "${c.name}", type: ${c.is_expense ? "expense" : "income"}`,
        )
        .join("\n");

      const { messages: rawMessages, analyticsMode } = (await req.json()) as {
        messages: OpenAI.Chat.ChatCompletionMessageParam[];
        analyticsMode?: boolean;
      };

      const history = (rawMessages ?? []).map(
        (msg): OpenAI.Chat.Completions.ChatCompletionMessageParam => {
          if (typeof msg.content === "string") {
            return {
              role: msg.role,
              content: msg.content,
            } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
          }
          return {
            role: msg.role,
            content: (
              (msg.content ?? []) as OpenAI.Chat.ChatCompletionContentPart[]
            ).map((part) => {
              if (part.type === "text")
                return { type: "text" as const, text: part.text };
              if (part.type === "image_url") return part;
              return part;
            }),
          } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
        },
      );

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        analyticsMode
          ? [
              {
                role: "system",
                content: `You are a financial advisor AI for ${user.email}. Analyze their expense data and respond in well-structured Markdown. Use headings, bullet points, and bold text where appropriate. Give 3-4 specific, actionable tips to optimize spending and save money. Be concise, direct, and encouraging. Currency is MYR.`,
              },
              ...history,
            ]
          : promptMessage({ email: user.email ?? "", categoryText, history });

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: env.OPENROUTER_API_KEY,
      });

      let lastResponseText: string | null = null;

      for (let step = 0; step < 3; step++) {
        const response = await openai.chat.completions.create({
          model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
          messages,
          tools: analyticsMode ? undefined : tools,
        });

        const msg = response.choices[0].message;
        messages.push(msg);
        lastResponseText = typeof msg.content === "string" ? msg.content : null;

        if (!msg.tool_calls || msg.tool_calls.length === 0) break;

        const pendingWriteToolCalls: {
          toolName: string;
          args: Record<string, unknown>;
        }[] = [];
        const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] =
          [];

        for (const tc of msg.tool_calls) {
          const args = JSON.parse(tc.function.arguments ?? "{}") as Record<
            string,
            unknown
          >;

          if (WRITE_TOOLS.includes(tc.function.name)) {
            pendingWriteToolCalls.push({
              toolName: tc.function.name,
              args:
                tc.function.name === "addExpense"
                  ? normalizeAddExpenseArgs(args)
                  : args,
            });
            toolResults.push({
              role: "tool",
              tool_call_id: tc.id,
              content: "pending_confirmation",
            });
          } else if (tc.function.name === "listExpenses") {
            let query = supabase
              .from("expense")
              .select(
                "id, name, amount, spend_date, is_expense, expense_category(name)",
              )
              .order("spend_date", { ascending: false })
              .limit(Number(args.limit ?? 10));

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
          return json(
            { message: null, pendingToolCalls: pendingWriteToolCalls },
            200,
            cors,
          );
        }

        messages.push(...toolResults);
      }

      return json(
        { message: lastResponseText, pendingToolCalls: null },
        200,
        cors,
      );
    } catch (err) {
      console.error(err);
      return json({ error: "Internal server error" }, 500, cors);
    }
  },
};
