import { z } from "zod";

/** Max number of attachments the worker accepts per turn. */
export const MAX_ATTACHMENTS_PER_TURN = 4;

/** Image MIME types the worker forwards to the LLM (sent as URLs). */
export const allowedImageMimeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Audio MIME types the worker forwards to the LLM. The OpenAI-compatible
 * `input_audio` API only accepts wav/mp3, so we restrict to those. `audio/mpeg`
 * is the standard MIME for .mp3 files and is normalised to `audio/mp3` before
 * being sent to the model.
 */
export const allowedAudioMimeSchema = z.enum([
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
]);

/** MIME types the worker knows how to forward to the LLM. */
export const allowedAttachmentMimeSchema = z.union([
  allowedImageMimeSchema,
  allowedAudioMimeSchema,
]);

export const attachmentSchema = z.object({
  url: z.string().url(),
  contentType: allowedAttachmentMimeSchema,
  name: z.string().max(255).optional(),
});

export type ChatAttachment = z.infer<typeof attachmentSchema>;

export const chatRequestSchema = z
  .object({
    message: z.string().max(8000),
    sessionId: z.string().uuid().optional(),
    analyticsMode: z.boolean().optional(),
    attachments: z.array(attachmentSchema).max(MAX_ATTACHMENTS_PER_TURN).optional(),
  })
  .refine((v) => v.message.trim().length > 0 || (v.attachments?.length ?? 0) > 0, {
    message: "Provide a message, an attachment, or both.",
    path: ["message"],
  });

export type ChatRequestBody = z.infer<typeof chatRequestSchema>;
