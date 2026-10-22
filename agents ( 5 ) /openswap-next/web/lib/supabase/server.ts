import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getEnv } from "../env";
import type { Database } from "./database.types";

// A Supabase client that acts as the signed-in user of the current request.
export type Db = SupabaseClient<Database>;

// The only user fields the app needs. Name and email are for display, never for permissions.
export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
}

// Create one client per request and pass it down; the saves that run after streaming reuse it.
export async function createClient(): Promise<Db> {
  // Read cookies first: it marks the route as per-request, so `next build` never runs it (and never needs the env).
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = getEnv();

  return createServerClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't write cookies. That's fine: the proxy already refreshed them.
        }
      },
    },
  });
}

// For API routes: this request's client plus who is signed in, or null when nobody is.
export async function authenticate(): Promise<{ db: Db; user: CurrentUser } | null> {
  const db = await createClient();
  const user = await getCurrentUser(db);

  return user ? { db, user } : null;
}

// Who is signed in? Returns null when there is no valid login.
export async function getCurrentUser(db: Db): Promise<CurrentUser | null> {
  // getClaims verifies the token's signature. getSession would trust the raw cookie.
  const { data, error } = await db.auth.getClaims();

  if (error || !data) return null;

  const { sub, email, user_metadata: metadata } = data.claims;

  return {
    id: sub,
    email: email ?? null,
    // Google puts the display name in full_name (and sometimes name).
    name: [metadata?.full_name, metadata?.name].find((value): value is string => typeof value === "string") ?? null,
  };
}
