import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client Configuration
 * Credentials are read safely from environment variables (.env).
 * Secrets are excluded from version control via .gitignore.
 */
const supabaseUrl = (typeof process !== "undefined" && process.env?.SUPABASE_URL)
  || (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL);

const supabaseKey = (typeof process !== "undefined" && process.env?.SUPABASE_API_KEY)
  || (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_API_KEY);

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase credentials. Please define SUPABASE_URL and SUPABASE_API_KEY in your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);