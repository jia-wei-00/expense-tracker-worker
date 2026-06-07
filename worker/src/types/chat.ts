import { z } from "zod";

/** Max number of attachments the worker accepts per turn. */
export const MAX_ATTACHMENTS_PER_TURN = 4;

/** MIME types the worker knows how to forward to the LLM. */
export const allowedAttachmentMimeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
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
