import { createUIMessageStreamResponse, toUIMessageStream } from "ai";
import { z } from "zod";
import { streamSwapAgent } from "@/lib/agent/swap-agent";
import { generateTitle } from "@/lib/agent/title";
import { GENERIC_ERROR_MESSAGE, jsonError, serverError, unauthorized } from "@/lib/http";
import { getConversation, saveConversation, startConversation } from "@/lib/store/conversations";
import { getPreferences } from "@/lib/store/profiles";
import { authenticate } from "@/lib/supabase/server";

// The browser sends only the chat id and the new text. The model context never leaves the server.
const chatRequestSchema = z.object({
  conversationId: z.uuid(),
  userPrompt: z.string().trim().min(1),
});

// Continue the selected conversation using its ID and the new text from the browser.
export async function POST(req: Request): Promise<Response> {
  // Signed-out requests stop here, before they can spend a model request.
  const auth = await authenticate();

  if (!auth) return unauthorized();

  // Reject bad input before it can spend a model request.
  const body = chatRequestSchema.safeParse(await req.json().catch(() => null));

  if (!body.success) return jsonError(400, "A conversation id and a user prompt are required.");

  const { conversationId, userPrompt } = body.data;
  const { db } = auth;
  console.log("[/api/chat] prompt:", userPrompt);

  try {
    // The saved chat and the user's preferences don't depend on each other, so load them together.
    const [savedConversation, preferences] = await Promise.all([
      getConversation(db, conversationId),
      getPreferences(db),
    ]);

    // A chat id the server has never seen is a fresh chat.
    const conversation = savedConversation ?? startConversation(conversationId);

    // Name a conversation once, from its first message.
    const title = conversation.chatHistory.length === 0 ? await generateTitle(userPrompt) : conversation.title;

    // Run the agent loop and stream its answer to the browser as it is written.
    const result = streamSwapAgent({
      contextHistory: conversation.contextHistory,
      userPrompt,
      preferences,
      onComplete: async ({ contextHistory, answer }) => {
        // Save the new exchange so the page still has it after a reload. This runs after the stream ends,
        // so it reuses the client created above, which still holds this request's login.
        try {
          await saveConversation(db, {
            ...conversation,
            title,
            chatHistory: [
              ...conversation.chatHistory,
              { role: "user", content: userPrompt },
              { role: "assistant", content: answer },
            ],
            contextHistory,
          });
        } catch (error: unknown) {
          console.error("Saving the conversation failed:", error);
        }
      },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        // Send the web pages the answer was built from, so the browser can list them as sources.
        sendSources: true,
        // Mid-stream errors reach the browser as one friendly message; the detail stays in the server log.
        onError: (error) => {
          console.error(error);
          return GENERIC_ERROR_MESSAGE;
        },
      }),
    });
  } catch (error: unknown) {
    return serverError(error);
  }
}
