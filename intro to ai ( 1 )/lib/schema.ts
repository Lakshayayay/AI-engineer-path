import { z } from "zod";

/**
 * ==============================================================================
 * ZOD VALIDATION SCHEMAS
 * ==============================================================================
 * Zod validates data at RUNTIME (when users submit forms or send API calls)
 * and automatically infers static TypeScript types.
 */

// A useChat UIMessage. `parts` content varies (text, tool-call, tool-result),
// so part shape stays loose — the envelope (role/id/array bounds) is what
// keeps an arbitrary payload from reaching convertToModelMessages.
const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.record(z.string(), z.unknown())),
});

// Validates the incoming Gift Request POST body
// Ensures the user doesn't submit empty text, oversized payloads, or malformed
// message envelopes (DoS / abuse protection)
export const GiftRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).max(50, "Conversation is too long").optional(),
  prompt: z.string().trim().min(3, "Please provide a more descriptive wish (at least 3 characters)").max(2000).optional(),
  userPrompt: z.string().trim().min(3, "Please provide a more descriptive wish (at least 3 characters)").max(2000).optional(),
}).refine((data) => (data.messages && data.messages.length > 0) || Boolean(data.prompt) || Boolean(data.userPrompt), {
  message: "Please provide a more descriptive wish (at least 3 characters)",
});

// Automatically extract the TypeScript type from the Zod schema
export type GiftRequestInput = z.infer<typeof GiftRequestSchema>;
