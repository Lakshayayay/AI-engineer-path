import { isSupabaseEnabled } from "./auth";
import { HistoryItem } from "./types";

/**
 * ==============================================================================
 * DUAL-MODE DATABASE / HISTORY SERVICE — Supabase Edition
 * ==============================================================================
 * Automatically switches between:
 * 1. Supabase PostgreSQL (when NEXT_PUBLIC_SUPABASE_URL is set in .env).
 * 2. Browser LocalStorage (fallback for offline zero-config dev).
 *
 * Supabase Table required (run in Supabase SQL editor):
 * ---
 * create table public.wishes (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references auth.users(id) on delete cascade not null,
 *   prompt text not null,
 *   response_text text not null,
 *   created_at timestamp with time zone default now()
 * );
 * alter table public.wishes enable row level security;
 * create policy "Users read own" on public.wishes for select using (auth.uid() = user_id);
 * create policy "Users insert own" on public.wishes for insert with check (auth.uid() = user_id);
 * ---
 */

/**
 * saveConversation — Save a completed AI wish to the database
 */
export async function saveConversation(
  userId: string,
  prompt: string,
  responseText: string
): Promise<{ success: boolean; id?: string; error?: string }> {

  if (isSupabaseEnabled()) {
    // Save to Supabase PostgreSQL
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("wishes")
      .insert({ user_id: userId, prompt, response_text: responseText })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase Save Error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  }

  // Fallback: Save to localStorage
  try {
    const historyKey = `mock_history_${userId}`;
    const history: HistoryItem[] = JSON.parse(
      localStorage.getItem(historyKey) || "[]"
    );
    const id = "hist_" + Math.random().toString(36).substring(2, 11);
    // Prepend newest wish to top of list
    history.unshift({ id, prompt, responseText, timestamp: Date.now() });
    localStorage.setItem(historyKey, JSON.stringify(history));
    return { success: true, id };
  } catch (error: any) {
    console.error("LocalStorage Save Error:", error);
    return { success: false, error: error?.message || "Storage error" };
  }
}

/**
 * getConversationHistory — Fetch all saved wishes for a specific user
 */
export async function getConversationHistory(userId: string): Promise<HistoryItem[]> {

  if (isSupabaseEnabled()) {
    // Fetch from Supabase PostgreSQL
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("wishes")
      .select("id, prompt, response_text, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase Fetch Error, falling back to local:", error.message);
      return loadLocalHistory(userId);
    }

    // Map Supabase column names to our HistoryItem interface
    return (data || []).map((row: any) => ({
      id: row.id,
      prompt: row.prompt,
      responseText: row.response_text,
      timestamp: new Date(row.created_at).getTime(),
    }));
  }

  // Fallback: fetch from localStorage
  return loadLocalHistory(userId);
}

// Helper: Load history from localStorage (offline mode)
function loadLocalHistory(userId: string): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const historyKey = `mock_history_${userId}`;
    return JSON.parse(localStorage.getItem(historyKey) || "[]");
  } catch (error) {
    console.error("Error parsing local history:", error);
    return [];
  }
}
