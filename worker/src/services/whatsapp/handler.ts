import type { SupabaseClient } from "@supabase/supabase-js";
import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
  type MessageContent,
} from "@langchain/core/messages";
import { DB_TABLE } from "@/constants/db";
import { VERIFY_PAYLOAD_PREFIX } from "@/constants/whatsapp";
import type { Env } from "@/env";
import { categoryListSchema } from "@/types/expense";
import { buildAgentSystemPrompt } from "@/ai/prompts";
import { formatCategoryList } from "@/lib/parsers";
import { resolveChatModel } from "@/services/ai";
import { createServiceClient } from "@/services/supabase";
import { runAgentLoop } from "@/services/agent";
import { sendTextMessage } from "@/services/whatsapp/api";
import {
  handleConfirmationReply,
  savePendingAndAskConfirmation,
} from "@/services/whatsapp/confirm";
import {
  fetchImageAsContent,
  transcribeAudio,
} from "@/services/whatsapp/media";
import { handleVerificationReply } from "@/services/whatsapp/verify";
import {
  parseIncomingWebhook,
  verifyMetaSignature,
} from "@/services/whatsapp/webhook";

const GENERIC_ERROR_REPLY =
  "Sorry, something went wrong on my end. Please try again in a moment.";

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

  console.log(parsed, "here is parsed");

  const supabase = createServiceClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

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

  try {
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
      await handleAudioMessage(
        parsed.from,
        parsed.mediaId,
        userId,
        supabase,
        env,
      );
    } else if (parsed.type === "image" && parsed.mediaId) {
      await handleImageMessage(
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
  } catch (err) {
    console.error("WhatsApp handler error", err);
    await safeSendText(parsed.from, GENERIC_ERROR_REPLY, env);
  }

  return new Response("OK", { status: 200 });
}

async function handleAudioMessage(
  from: string,
  mediaId: string,
  userId: string,
  supabase: SupabaseClient,
  env: Env,
) {
  let transcript: string | null = null;
  try {
    transcript = await transcribeAudio(mediaId, env);
  } catch (err) {
    console.error("transcribeAudio threw", err);
  }
  if (!transcript) {
    await sendTextMessage(
      from,
      "Sorry, I couldn't understand that voice note. Please try again or type your message.",
      env,
    );
    return;
  }
  await runWhatsAppAgent(from, transcript, userId, supabase, env);
}

async function handleImageMessage(
  from: string,
  mediaId: string,
  caption: string | undefined,
  userId: string,
  supabase: SupabaseClient,
  env: Env,
) {
  let content: MessageContent | null = null;
  try {
    content = await fetchImageAsContent(mediaId, caption, env);
  } catch (err) {
    console.error("fetchImageAsContent threw", err);
  }
  if (!content) {
    await sendTextMessage(
      from,
      "Sorry, I couldn't read that image. Please try again or type the details instead.",
      env,
    );
    return;
  }
  await runWhatsAppAgent(from, content, userId, supabase, env);
}

async function safeSendText(to: string, text: string, env: Env) {
  try {
    await sendTextMessage(to, text, env);
  } catch (err) {
    console.error("Failed to send error reply to WhatsApp", err);
  }
}

async function runWhatsAppAgent(
  from: string,
  userContent: MessageContent,
  userId: string,
  supabase: SupabaseClient,
  env: Env,
) {
  const [{ data: categories }, { data: userData }] = await Promise.all([
    supabase
      .from(DB_TABLE.EXPENSE_CATEGORY)
      .select("id, name, is_expense")
      .order("name"),
    supabase.auth.admin.getUserById(userId),
  ]);

  const email = userData?.user?.email ?? "";
  const categoryList = categoryListSchema.parse(categories ?? []);
  const categoryText = formatCategoryList(categoryList);
  const categoryNames = new Map(categoryList.map((c) => [c.id, c.name]));

  // Stateless: each WhatsApp message is handled on its own, with no history.
  const llm = resolveChatModel(env);
  const messages: BaseMessage[] = [
    new SystemMessage(buildAgentSystemPrompt(email, categoryText)),
    new HumanMessage({ content: userContent }),
  ];

  try {
    const result = await runAgentLoop({ llm, messages, supabase, userId });

    if (result.pendingActions.length > 0) {
      await savePendingAndAskConfirmation(
        from,
        result.pendingActions,
        categoryNames,
        supabase,
        env,
      );
      return;
    }

    if (result.text) await sendTextMessage(from, result.text, env);
  } catch (err) {
    console.error("runWhatsAppAgent error", err);
    const reply =
      err instanceof Error && /rate.?limit/i.test(err.message)
        ? "Sorry, the AI is currently rate limited. Please try again in a moment."
        : GENERIC_ERROR_REPLY;
    await safeSendText(from, reply, env);
  }
}
