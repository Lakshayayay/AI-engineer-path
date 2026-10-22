import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign out clears the login cookie, then the user lands on the login screen.
export async function POST(req: Request): Promise<Response> {
  const db = await createClient();
  await db.auth.signOut();

  return NextResponse.redirect(new URL("/login", req.url), 303);
}
