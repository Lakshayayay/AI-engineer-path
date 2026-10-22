import { z } from "zod";
import { jsonError, serverError, unauthorized } from "@/lib/http";
import { deleteConversation, getConversation, toBrowserConversation } from "@/lib/store/conversations";
import { authenticate } from "@/lib/supabase/server";

const NOT_FOUND_MESSAGE = "Conversation not found.";

// Reopen the visible transcript. Model history stays on the server.
export async function GET(_req: Request, ctx: RouteContext<"/api/conversations/[id]">): Promise<Response> {
  const auth = await authenticate();

  if (!auth) return unauthorized();

  // A malformed id can't match any chat, and would only make the database fail with a 500.
  const id = z.uuid().safeParse((await ctx.params).id);

  if (!id.success) return jsonError(404, NOT_FOUND_MESSAGE);

  try {
    const conversation = await getConversation(auth.db, id.data);

    if (!conversation) return jsonError(404, NOT_FOUND_MESSAGE);

    return Response.json({ conversation: toBrowserConversation(conversation) });
  } catch (error: unknown) {
    return serverError(error);
  }
}

// Delete one chat. Someone else's chat looks the same as a missing one: 404.
export async function DELETE(_req: Request, ctx: RouteContext<"/api/conversations/[id]">): Promise<Response> {
  const auth = await authenticate();

  if (!auth) return unauthorized();

  const id = z.uuid().safeParse((await ctx.params).id);

  if (!id.success) return jsonError(404, NOT_FOUND_MESSAGE);

  try {
    const wasDeleted = await deleteConversation(auth.db, id.data);

    if (!wasDeleted) return jsonError(404, NOT_FOUND_MESSAGE);

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return serverError(error);
  }
}
