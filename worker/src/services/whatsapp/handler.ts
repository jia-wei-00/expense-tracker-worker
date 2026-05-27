import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { DB_TABLE } from "../../constants/db";
import { VERIFY_PAYLOAD_PREFIX } from "../../constants/whatsapp";
import type { Env } from "../../env";
import type { Category } from "../../types/expense";
import { buildAgentPrompt } from "../../ai/prompts";
import { formatCategoryList } from "../../lib/parsers";
import { resolveAIConfig } from "../ai";
import { createServiceClient } from "../supabase";
import { runAgentLoop } from "../agent";
import { sendTextMessage } from "./api";
import {
  handleConfirmationReply,
  savePendingAndAskConfirmation,
} from "./confirm";
import { fetchMediaAsContent } from "./media";
import { handleVerificationReply } from "./verify";
import { parseIncomingWebhook, verifyMetaSignature } from "./webhook";

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

  // Verification button replies are handled before the linked user lookup
  // since unverified users still need to be able to verify.
  if (
    parsed.type === "button_reply" &&
    parsed.buttonId?.startsWith(VERIFY_PAYLOAD_PREFIX)
  ) {
    await handleVerificationReply(parsed.from, parsed.buttonId, supabase, env);
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
    await handleConfirmationReply(
      parsed.from,
      parsed.buttonId,
      userId,
      supabase,
      env,
    );
  } else if (parsed.type === "text" && parsed.text) {
    await runWhatsAppAgent(parsed.from, parsed.text, userId, supabase, env);
  } else if (parsed.type === "audio" && parsed.mediaId) {
    const content = await fetchMediaAsContent(parsed.mediaId, undefined, env);
    if (!content) {
      await sendTextMessage(
        parsed.from,
        "Sorry, I couldn't process that audio. Try sending text instead.",
        env,
      );
    } else {
      await runWhatsAppAgent(parsed.from, content, userId, supabase, env);
    }
  } else if (parsed.type === "image" && parsed.mediaId) {
    const content = await fetchMediaAsContent(
      parsed.mediaId,
      parsed.caption,
      env,
    );
    if (!content) {
      await sendTextMessage(
        parsed.from,
        "Sorry, I couldn't process that image. Try sending text instead.",
        env,
      );
    } else {
      await runWhatsAppAgent(parsed.from, content, userId, supabase, env);
    }
  } else if (parsed.type === "other") {
    await sendTextMessage(
      parsed.from,
      "Sorry, I can only handle text, voice, and image messages.",
      env,
    );
  }

  return new Response("OK", { status: 200 });
}

async function runWhatsAppAgent(
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
      // .eq("user_id", userId)
      .order("name"),
    supabase.auth.admin.getUserById(userId),
  ]);

  const email = userData?.user?.email ?? "";
  const categoryText = formatCategoryList((categories ?? []) as Category[]);

  const { client: openai, model } = resolveAIConfig(env);
  const messages = buildAgentPrompt({
    email,
    categoryText,
    history: [{ role: "user", content: userContent }],
  });

  try {
    const result = await runAgentLoop({
      openai,
      model,
      messages,
      supabase,
      userId,
    });

    if (result.pendingActions.length > 0) {
      await savePendingAndAskConfirmation(
        from,
        result.pendingActions[0],
        supabase,
        env,
      );
      return;
    }

    if (result.text) await sendTextMessage(from, result.text, env);
  } catch (err) {
    if (err instanceof OpenAI.RateLimitError) {
      await sendTextMessage(
        from,
        "Sorry, the AI is currently rate limited. Please try again in a moment.",
        env,
      );
      return;
    }
    throw err;
  }
}
