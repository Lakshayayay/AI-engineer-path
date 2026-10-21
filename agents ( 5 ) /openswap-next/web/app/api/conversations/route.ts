import { serverError } from "@/lib/http";
import { listConversations } from "@/lib/store/conversations";

// List summaries for the sidebar, without either history array.
export async function GET(): Promise<Response> {
  try {
    return Response.json({ conversations: await listConversations() });
  } catch (error: unknown) {
    return serverError(error);
  }
}
