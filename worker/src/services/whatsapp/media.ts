import OpenAI from "openai";
import { arrayBufferToBase64 } from "../../lib/base64";
import { downloadMetaMedia } from "./api";
import type { Env } from "../../env";

/**
 * Download a media file from Meta and convert it to OpenAI content parts.
 * Returns null if the media type isn't supported.
 */
export async function fetchMediaAsContent(
  mediaId: string,
  caption: string | undefined,
  env: Env,
): Promise<OpenAI.Chat.ChatCompletionContentPart[] | null> {
  const { data, mimeType } = await downloadMetaMedia(mediaId, env);
  const base64 = arrayBufferToBase64(data);
  const parts = buildMediaContent(mimeType, base64, caption);
  return parts.length ? parts : null;
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
