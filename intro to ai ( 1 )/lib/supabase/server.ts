import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Creates a server-side Supabase client for use in Route Handlers (API routes)
// Reads and writes session cookies on the server automatically
export async function createServerSupabaseClient() {
  const cookieStore = await cookies(); // Read cookies from the incoming request

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll(); // Read all cookies for session auth
        },
        setAll(cookiesToSet) {
          try {
            // Write updated session cookies back to response
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe to ignore in read-only server contexts (e.g., Server Components)
          }
        },
      },
    }
  );
}
