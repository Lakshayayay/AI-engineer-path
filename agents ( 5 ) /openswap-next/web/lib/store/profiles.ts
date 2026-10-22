import type { Db } from "../supabase/server";

// The saved preferences of the signed-in user. Row Level Security returns only their own row; no row means none saved yet.
export async function getPreferences(db: Db): Promise<string> {
  const { data, error } = await db.from("profiles").select("preferences").maybeSingle();

  if (error) throw error;

  return data?.preferences ?? "";
}

// Create the profile on the first save, then replace the text on later saves.
export async function savePreferences(db: Db, userId: string, preferences: string): Promise<void> {
  const { error } = await db
    .from("profiles")
    .upsert({ id: userId, preferences, updated_at: new Date().toISOString() });

  if (error) throw error;
}
