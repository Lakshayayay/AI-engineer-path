import { z } from "zod";
import { jsonError, serverError, unauthorized } from "@/lib/http";
import { savePreferences } from "@/lib/store/profiles";
import { authenticate } from "@/lib/supabase/server";
import { MAX_PREFERENCES_LENGTH } from "@/lib/types";

// An empty string is allowed: it clears the saved preferences.
const profileRequestSchema = z.object({
  preferences: z.string().trim().max(MAX_PREFERENCES_LENGTH),
});

// Save the signed-in user's preferences. The agent reads them on the next chat message.
export async function PUT(req: Request): Promise<Response> {
  const auth = await authenticate();

  if (!auth) return unauthorized();

  const body = profileRequestSchema.safeParse(await req.json().catch(() => null));

  if (!body.success) return jsonError(400, `Preferences must be text of at most ${MAX_PREFERENCES_LENGTH} characters.`);

  try {
    await savePreferences(auth.db, auth.user.id, body.data.preferences);

    return Response.json({ preferences: body.data.preferences });
  } catch (error: unknown) {
    return serverError(error);
  }
}
