import type { ContentBlock } from "@langchain/core/messages";
import { GEMINI_MODEL } from "@/constants/ai";
import { arrayBufferToBase64 } from "@/lib/base64";
import { downloadMetaMedia } from "@/services/whatsapp/api";
import type { Env } from "@/env";

const GEMINI_NATIVE_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const TRANSCRIPTION_PROMPT =
  "Transcribe the user's voice note exactly as spoken. Output ONLY the transcription text — no commentary, no quotes, no prefix.";

/**
 * Download an image from Meta and return LangChain v1 data content blocks
 * (`source_type: "base64"`) that LangChain's OpenAI converter will turn into a
 * standard `image_url` data URL part. Returns null if the media isn't an image.
 */
export async function fetchImageAsContent(
  mediaId: string,
  caption: string | undefined,
  env: Env,
): Promise<ContentBlock[] | null> {
  const { data, mimeType } = await downloadMetaMedia(mediaId, env);
  if (!mimeType.startsWith("image/")) return null;

  const base64 = arrayBufferToBase64(data);
  const blocks: ContentBlock[] = [
    {
      type: "image",
      source_type: "base64",
      mime_type: mimeType,
      data: base64,
    },
  ];
  if (caption) blocks.push({ type: "text", text: caption });
  return blocks;
}

/**
 * Transcribe a WhatsApp voice note via Gemini's native `:generateContent`
 * endpoint, which accepts OGG/Opus directly (unlike the OpenAI-compat shim,
 * which only allows wav/mp3). Returns the trimmed transcript, or null on
 * failure / empty result.
 */
export async function transcribeAudio(
  mediaId: string,
  env: Env,
): Promise<string | null> {
  const { data, mimeType } = await downloadMetaMedia(mediaId, env);
  if (!mimeType.startsWith("audio/")) return null;

  const base64 = arrayBufferToBase64(data);
  const url = `${GEMINI_NATIVE_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: TRANSCRIPTION_PROMPT },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Audio transcription failed", res.status, await res.text());
    return null;
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text && text.length > 0 ? text : null;
}
