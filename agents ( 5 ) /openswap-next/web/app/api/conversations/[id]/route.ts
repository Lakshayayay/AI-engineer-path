import { jsonError, serverError } from "@/lib/http";
import { getConversation, toBrowserConversation } from "@/lib/store/conversations";

// Reopen the visible transcript. Model history stays on the server.
export async function GET(_req: Request, ctx: RouteContext<"/api/conversations/[id]">): Promise<Response> {
  const { id } = await ctx.params;

  try {
    const conversation = await getConversation(id);

    if (!conversation) return jsonError(404, "Conversation not found.");

    return Response.json({ conversation: toBrowserConversation(conversation) });
  } catch (error: unknown) {
    return serverError(error);
  }
}
