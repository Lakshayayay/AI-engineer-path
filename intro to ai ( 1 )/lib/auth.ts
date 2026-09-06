import { AppUser, AuthResult } from "./types";

/**
 * ==============================================================================
 * AUTHENTICATION SERVICE — Google OAuth via Supabase
 * ==============================================================================
 * Single sign-on with Google. Falls back to guest mode when Supabase
 * credentials are not configured.
 */

// Check if Supabase credentials exist in environment variables
export const isSupabaseEnabled = (): boolean =>
  typeof window !== "undefined" &&
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== ""
  );

/**
 * initAuth — Subscribe to real-time auth state changes.
 * Fires immediately with the current user (or null), and again on every login/logout.
 */
export async function initAuth(onUserChanged: (user: AppUser | null) => void) {
  if (isSupabaseEnabled()) {
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();

    // Subscribe to auth state changes (login, logout, token refresh).
    // The callback defers to a macrotask because callers (e.g. refreshHistory)
    // make their own Supabase calls, and doing that synchronously inside this
    // callback can deadlock the auth client (documented Supabase gotcha).
    supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (session?.user) {
          onUserChanged({
            uid: session.user.id,
            email: session.user.email || "",
            displayName:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.display_name ||
              session.user.email?.split("@")[0] ||
              "Genie User",
            avatarUrl: session.user.user_metadata?.avatar_url || undefined,
          });
        } else {
          onUserChanged(null);
        }
      }, 0);
    });

    // Validate current session on first load via server round-trip
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      onUserChanged({
        uid: user.id,
        email: user.email || "",
        displayName:
          user.user_metadata?.full_name ||
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "Genie User",
        avatarUrl: user.user_metadata?.avatar_url || undefined,
      });
    }
  } else {
    // No Supabase configured — guest mode
    onUserChanged(null);
  }
}

/**
 * signInWithGoogle — OAuth sign-in via Google (redirects to Google consent screen)
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!isSupabaseEnabled()) {
    return {
      success: false,
      error: "Google Sign-In requires Supabase. Add NEXT_PUBLIC_SUPABASE_URL to your .env.local file.",
    };
  }

  const { createClient } = await import("./supabase/client");
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });

  if (error) return { success: false, error: error.message };
  return { success: true }; // Redirect handles the rest
}

/**
 * signOut — Log the user out
 */
export async function signOut(): Promise<AuthResult> {
  if (isSupabaseEnabled()) {
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
  return { success: true };
}
