import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "./supabase";
import { promptMessage, tools } from "./tools";
import {
  normalizeAddExpenseArgs,
  parseAddExpenseArgs,
  parseDeleteExpenseArgs,
  formatCategoryList,
  resolveAIConfig,
  isWriteToolName,
} from "./utils";
import {
  sendTextMessage,
  sendInteractiveButtons,
  parseIncomingWebhook,
  downloadMetaMedia,
  verifyMetaSignature,
} from "./whatsapp";
import {
  MAX_LLM_STEPS,
  DEFAULT_EXPENSE_LIMIT,
  PENDING_ACTION_TTL_MS,
  PENDING_CONFIRMATION_REPLY,
  TOOL_NAME,
  BUTTON_PREFIX,
  DB_TABLE,
  VERIFY_PAYLOAD_PREFIX,
} from "./constants";
import type { Env } from "./index";
import type { Category, PendingAction } from "./types";
import OpenAI from "openai";

export async function handleWhatsAppVerification(
  req: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function handleWhatsAppMessage(
  req: Request,
  env: Env,
): Promise<Response> {
  const rawBody = await req.arrayBuffer();
  const valid = await verifyMetaSignature(
    rawBody,
    req.headers.get("X-Hub-Signature-256"),
    env.WHATSAPP_APP_SECRET,
  );
  if (!valid) return new Response("Forbidden", { status: 403 });

  const body = JSON.parse(new TextDecoder().decode(rawBody));
  const parsed = parseIncomingWebhook(body);

  // Always return 200 to Meta — non-200 causes it to retry and spam the endpoint
  if (!parsed) return new Response("OK", { status: 200 });

  const supabase = createServiceClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (parsed.type === "button_reply" && parsed.buttonId?.startsWith(VERIFY_PAYLOAD_PREFIX)) {
    await handleLinkReply(parsed.from, parsed.buttonId, supabase, env);
    return new Response("OK", { status: 200 });
  }

  const { data: linkedUser } = await supabase
    .from(DB_TABLE.WHATSAPP_USERS)
    .select("user_id, is_verified")
    .eq("phone_number", parsed.from)
    .single();

  if (!linkedUser) {
    await sendTextMessage(
      parsed.from,
      "Your number is not linked to an account. Please add it in the app settings.",
      env,
    );
    return new Response("OK", { status: 200 });
  }

  if (!linkedUser.is_verified) {
    await sendTextMessage(
      parsed.from,
      "Your number is pending verification. Please check your WhatsApp for the verification message.",
      env,
    );
    return new Response("OK", { status: 200 });
  }

  const userId: string = linkedUser.user_id;

  if (parsed.type === "button_reply" && parsed.buttonId) {
    await handleButtonReply(
      parsed.from,
      parsed.buttonId,
      userId,
      supabase,
      env,
    );
  } else if (parsed.type === "text" && parsed.text) {
    await runAgentLoop(parsed.from, parsed.text, userId, supabase, env);
  } else if (parsed.type === "audio" && parsed.mediaId) {
    await handleMediaMessage(
      parsed.from,
      parsed.mediaId,
      undefined,
      userId,
      supabase,
      env,
    );
  } else if (parsed.type === "image" && parsed.mediaId) {
    await handleMediaMessage(
      parsed.from,
      parsed.mediaId,
      parsed.caption,
      userId,
      supabase,
      env,
    );
  } else if (parsed.type === "other") {
    await sendTextMessage(
      parsed.from,
      "Sorry, I can only handle text, voice, and image messages.",
      env,
    );
  }

  return new Response("OK", { status: 200 });
}

async function handleLinkReply(
  from: string,
  payload: string,
  supabase: SupabaseClient,
  env: Env,
) {
  const userId = payload.slice(VERIFY_PAYLOAD_PREFIX.length);
  const { error } = await supabase
    .from(DB_TABLE.WHATSAPP_USERS)
    .update({ is_verified: true })
    .eq("phone_number", from)
    .eq("user_id", userId);

  await sendTextMessage(
    from,
    error
      ? "Verification failed. Please try again from the app settings."
      : "Your number is verified! You can now use the expense tracker via WhatsApp.",
    env,
  );
}

async function handleButtonReply(
  from: string,
  buttonId: string,
  userId: string,
  supabase: SupabaseClient,
  env: Env,
) {
  const isConfirm = buttonId.startsWith(BUTTON_PREFIX.CONFIRM);
  const isCancel = buttonId.startsWith(BUTTON_PREFIX.CANCEL);
  if (!isConfirm && !isCancel) return;

  const pendingId = buttonId.slice(
    isConfirm ? BUTTON_PREFIX.CONFIRM.length : BUTTON_PREFIX.CANCEL.length,
  );

  if (isCancel) {
    await supabase
      .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
      .delete()
      .eq("id", pendingId);
    await sendTextMessage(
      from,
      "Cancelled. Anything else I can help with?",
      env,
    );
    return;
  }

  const { data: pending } = await supabase
    .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
    .select("*")
    .eq("id", pendingId)
    .eq("phone_number", from)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!pending) {
    await sendTextMessage(
      from,
      "This action has expired. Please try again.",
      env,
    );
    return;
  }

  await supabase
    .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
    .delete()
    .eq("id", pendingId);

  if (pending.tool_name === TOOL_NAME.ADD_EXPENSE) {
    const args = parseAddExpenseArgs(pending.args);
    const { error } = await supabase
      .from(DB_TABLE.EXPENSE)
      .insert({ ...args, user_id: userId });
    await sendTextMessage(
      from,
      error
        ? "Failed to save. Please try again."
        : `Done! ${args.name} RM${args.amount} saved.`,
      env,
    );
  } else if (pending.tool_name === TOOL_NAME.DELETE_EXPENSE) {
    const { id } = parseDeleteExpenseArgs(pending.args);
    const { error } = await supabase
      .from(DB_TABLE.EXPENSE)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    await sendTextMessage(
      from,
      error ? "Failed to delete. Please try again." : "Done! Expense deleted.",
      env,
    );
  }
}

async function handleMediaMessage(
  from: string,
  mediaId: string,
  caption: string | undefined,
  userId: string,
  supabase: SupabaseClient,
  env: Env,
) {
  const { data, mimeType } = await downloadMetaMedia(mediaId, env);
  const base64 = arrayBufferToBase64(data);
  const content = buildMediaContent(mimeType, base64, caption);

  if (!content.length) {
    await sendTextMessage(
      from,
      "Sorry, I couldn't process that media type. Try sending text instead.",
      env,
    );
    return;
  }

  await runAgentLoop(from, content, userId, supabase, env);
}

function buildMediaContent(
  mimeType: string,
  base64: string,
  caption?: string,
): OpenAI.Chat.ChatCompletionContentPart[] {
  const parts: OpenAI.Chat.ChatCompletionContentPart[] = [];

  if (mimeType.startsWith("image/")) {
    parts.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${base64}` },
    });
    if (caption) parts.push({ type: "text", text: caption });
  } else if (mimeType.startsWith("audio/")) {
    parts.push({
      type: "input_audio",
      input_audio: { data: base64, format: resolveAudioFormat(mimeType) },
    });
  }

  return parts;
}

// SDK currently only accepts "wav" | "mp3" — map everything to the closest supported format.
// OpenRouter/the model may accept more at runtime; update this if the SDK type widens.
function resolveAudioFormat(mimeType: string): "wav" | "mp3" {
  if (mimeType.startsWith("audio/wav")) return "wav";
  return "mp3";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function runAgentLoop(
  from: string,
  userContent: string | OpenAI.Chat.ChatCompletionContentPart[],
  userId: string,
  supabase: SupabaseClient,
  env: Env,
) {
  const [{ data: categories }, { data: userData }] = await Promise.all([
    supabase
      .from(DB_TABLE.EXPENSE_CATEGORY)
      .select("id, name, is_expense")
      .eq("user_id", userId)
      .order("name"),
    supabase.auth.admin.getUserById(userId),
  ]);

  const email: string = userData?.user?.email ?? "";
  const categoryText = formatCategoryList((categories ?? []) as Category[]);

  const { client: openai, model } = resolveAIConfig(env);
  const messages = promptMessage({
    email,
    categoryText,
    history: [{ role: "user", content: userContent }],
  });

  try {
    for (let step = 0; step < MAX_LLM_STEPS; step++) {
      const response = await openai.chat.completions.create({
        model,
        messages,
        tools,
      });
      const msg = response.choices[0].message;
      messages.push(msg);

      if (!msg.tool_calls?.length) {
        if (msg.content) await sendTextMessage(from, msg.content, env);
        break;
      }

      const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] =
        [];
      let pendingAction: PendingAction | null = null;

      for (const tc of msg.tool_calls) {
        const args = JSON.parse(tc.function.arguments ?? "{}") as Record<
          string,
          unknown
        >;

        if (isWriteToolName(tc.function.name)) {
          if (!pendingAction) {
            if (tc.function.name === TOOL_NAME.ADD_EXPENSE) {
              pendingAction = {
                toolName: tc.function.name,
                args: normalizeAddExpenseArgs(args),
              };
            } else {
              pendingAction = {
                toolName: tc.function.name,
                args: { id: Number(args.id) },
              };
            }
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
            .eq("user_id", userId)
            .order("spend_date", { ascending: false })
            .limit(Number(args.limit ?? DEFAULT_EXPENSE_LIMIT));

          if (args.category) query = query.eq("category", Number(args.category));
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

      if (pendingAction) {
        await savePendingAndAskConfirmation(from, pendingAction, supabase, env);
        break;
      }

      messages.push(...toolResults);
    }
  } catch (err) {
    if (err instanceof OpenAI.RateLimitError) {
      await sendTextMessage(from, "Sorry, the AI is currently rate limited. Please try again in a moment.", env);
      return;
    }
    throw err;
  }
}

async function savePendingAndAskConfirmation(
  from: string,
  action: PendingAction,
  supabase: SupabaseClient,
  env: Env,
) {
  const expiresAt = new Date(Date.now() + PENDING_ACTION_TTL_MS).toISOString();

  const { data: inserted } = await supabase
    .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
    .insert({
      phone_number: from,
      tool_name: action.toolName,
      args: action.args,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  const pendingId: string = inserted?.id ?? "";

  const confirmText =
    action.toolName === TOOL_NAME.ADD_EXPENSE
      ? `Add "${action.args.name}" RM${action.args.amount}?`
      : `Delete expense #${action.args.id}?`;

  await sendInteractiveButtons(
    from,
    confirmText,
    [
      { id: `${BUTTON_PREFIX.CONFIRM}${pendingId}`, title: "Confirm" },
      { id: `${BUTTON_PREFIX.CANCEL}${pendingId}`, title: "Cancel" },
    ],
    env,
  );
}
