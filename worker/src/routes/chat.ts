import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
  type ContentBlock,
} from "@langchain/core/messages";
import type { Env } from "@/env";
import { DB_TABLE } from "@/constants/db";
import { buildAgentSystemPrompt, buildAnalyticsPrompt } from "@/ai/prompts";
import { jsonResponse } from "@/lib/http";
import { formatCategoryList } from "@/lib/parsers";
import { resolveChatModel } from "@/services/ai";
import { runAgentLoop } from "@/services/agent";
import { authenticateRequest } from "@/services/auth";
import { SupabaseChatMessageHistory } from "@/services/chat-history";
import { createSupabaseClient } from "@/services/supabase";
import { createTracing } from "@/services/tracing";
import { chatRequestSchema, type ChatAttachment } from "@/types/chat";
import { categoryListSchema } from "@/types/expense";

export async function handleChat(
  req: Request,
  env: Env,
  cors: Record<string, string>,
  ctx: ExecutionContext,
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, cors);
  }

  const tracing = createTracing(env);

  try {
    const auth = await authenticateRequest(req, env);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status, cors);

    const supabase = createSupabaseClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      auth.accessToken,
    );

    const rawBody = await req.json();
    const parseResult = chatRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return jsonResponse(
        {
          error: parseResult.error.issues[0]?.message ?? "Invalid request body",
        },
        400,
        cors,
      );
    }
    const {
      message,
      sessionId: providedSessionId,
      analyticsMode,
      attachments,
    } = parseResult.data;

    const { data: categories, error: categoriesError } = await supabase
      .from(DB_TABLE.EXPENSE_CATEGORY)
      .select("id, name, is_expense")
      .order("name");
    if (categoriesError) {
      console.error("Failed to fetch categories:", categoriesError.message);
      return jsonResponse({ error: "Failed to load categories" }, 500, cors);
    }

    const categoryText = formatCategoryList(
      categoryListSchema.parse(categories ?? []),
    );
    const email = auth.user.email ?? "";
    const llm = resolveChatModel(env);

    // Analytics mode: single-turn, no persistence. (Attachments ignored —
    // analytics summarises tabular data, not images.)
    if (analyticsMode) {
      const messages: BaseMessage[] = [
        new SystemMessage(buildAnalyticsPrompt(email)),
        new HumanMessage(message),
      ];
      const result = await runAgentLoop({
        llm,
        messages,
        supabase,
        enableTools: false,
        callbacks: tracing?.callbacks,
        metadata: { mode: "analytics", userId: auth.user.id },
      });
      if (tracing) ctx.waitUntil(tracing.flush());
      return jsonResponse(
        { message: result.text, pendingToolCalls: null, sessionId: null },
        200,
        cors,
      );
    }

    // Chat mode: server-side history per session.
    const sessionId = await ensureSession(supabase, providedSessionId, message);
    if (!sessionId) {
      return jsonResponse({ error: "Failed to create session" }, 500, cors);
    }

    const history = new SupabaseChatMessageHistory(supabase, sessionId);
    const priorMessages = await history.getMessages();
    const userMessage = buildUserMessage(message, attachments);
    await history.addMessage(userMessage);

    const messages: BaseMessage[] = [
      new SystemMessage(buildAgentSystemPrompt(email, categoryText)),
      ...priorMessages,
      userMessage,
    ];

    const result = await runAgentLoop({
      llm,
      messages,
      supabase,
      callbacks: tracing?.callbacks,
      metadata: { mode: "chat", sessionId, userId: auth.user.id },
    });
    if (tracing) ctx.waitUntil(tracing.flush());

    for (const m of result.newMessages) {
      await history.addMessage(m);
    }

    if (result.pendingActions.length > 0) {
      return jsonResponse(
        { message: null, pendingToolCalls: result.pendingActions, sessionId },
        200,
        cors,
      );
    }

    return jsonResponse(
      { message: result.text, pendingToolCalls: null, sessionId },
      200,
      cors,
    );
  } catch (err) {
    console.error(err);
    if (err instanceof Error && /rate.?limit/i.test(err.message)) {
      return jsonResponse(
        { error: "AI rate limit reached. Please try again in a moment." },
        429,
        cors,
      );
    }
    return jsonResponse({ error: "Internal server error" }, 500, cors);
  }
}

function buildUserMessage(
  text: string,
  attachments: ChatAttachment[] | undefined,
): HumanMessage {
  if (!attachments || attachments.length === 0) {
    return new HumanMessage(text);
  }
  const content: ContentBlock[] = [];
  if (text.trim().length > 0) {
    content.push({ type: "text", text });
  }
  for (const a of attachments) {
    if (a.contentType.startsWith("image/")) {
      content.push({
        type: "image",
        source_type: "url",
        url: a.url,
        mime_type: a.contentType,
      });
    }
    // Future media types (audio/file) get their own branches here.
  }
  return new HumanMessage({ content });
}

async function ensureSession(
  supabase: ReturnType<typeof createSupabaseClient>,
  providedSessionId: string | undefined,
  firstUserMessage: string,
): Promise<string | null> {
  if (providedSessionId) {
    const { data, error } = await supabase
      .from(DB_TABLE.CHAT_SESSION)
      .select("id")
      .eq("id", providedSessionId)
      .maybeSingle();
    if (error) {
      console.error("Failed to verify session:", error.message);
      return null;
    }
    if (data) return providedSessionId;
    // Session id was supplied but not found (deleted / wrong owner) — create a new one.
  }

  const trimmed = firstUserMessage.trim();
  const title = (trimmed.length > 0 ? trimmed : "New chat").slice(0, 60);
  const { data, error } = await supabase
    .from(DB_TABLE.CHAT_SESSION)
    .insert({ title })
    .select("id")
    .single();
  if (error || !data) {
    console.error("Failed to create session:", error?.message);
    return null;
  }
  return data.id as string;
}
