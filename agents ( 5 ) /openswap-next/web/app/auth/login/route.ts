import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Start Google sign-in: ask Supabase for Google's URL, then send the browser there.
export async function POST(req: Request): Promise<Response> {
  const { origin } = new URL(req.url);
  const db = await createClient();

  // Supabase saves a one-time code verifier cookie here (PKCE), so only this browser can finish the login.
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    console.error("Starting Google sign-in failed:", error);
    return NextResponse.redirect(`${origin}/login?error=1`, 303);
  }

  // 303 turns the browser's POST into a GET on Google's page.
  return NextResponse.redirect(data.url, 303);
}
