import { serverError, unauthorized } from "@/lib/http";
import { listConversations } from "@/lib/store/conversations";
import { authenticate } from "@/lib/supabase/server";

// List summaries for the sidebar, without either history array.
export async function GET(): Promise<Response> {
  const auth = await authenticate();

  if (!auth) return unauthorized();

  try {
    return Response.json({ conversations: await listConversations(auth.db) });
  } catch (error: unknown) {
    return serverError(error);
  }
}
