import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google sends the browser back here with a one-time code. Trade it for a login cookie.
export async function GET(req: Request): Promise<Response> {
  const { origin, searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  // No code means the user cancelled on Google's page, or the link was opened by hand.
  if (!code) return NextResponse.redirect(`${origin}/login?error=1`);

  const db = await createClient();
  // This call also writes the session cookie.
  const { error } = await db.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Signing in failed:", error);
    return NextResponse.redirect(`${origin}/login?error=1`);
  }

  // Always go home, never to a URL from the request, so this route can't be used as an open redirect.
  return NextResponse.redirect(`${origin}/`);
}
