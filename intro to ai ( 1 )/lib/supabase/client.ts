import { createBrowserClient } from "@supabase/ssr";

// Creates a singleton browser-side Supabase client
// Used in Client Components (pages, forms, auth modals)
// Reads the session from browser cookies automatically via @supabase/ssr
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,    // Your Supabase project URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Public anon key (safe to expose in browser)
  );
}
