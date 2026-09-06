import { AppUser, AuthResult } from "./types";

/**
 * ==============================================================================
 * DUAL-MODE AUTHENTICATION SERVICE — Supabase Edition
 * ==============================================================================
 * Automatically switches between:
 * 1. Real Supabase Auth (when NEXT_PUBLIC_SUPABASE_URL is set in .env)
 * 2. Local Mock Auth (stored in browser localStorage for offline / zero-config dev)
 *
 * Concept: This is "graceful degradation" — the app always works,
 * even without credentials configured yet.
 */

// Check if Supabase credentials exist in environment variables
export const isSupabaseEnabled = (): boolean =>
  typeof window !== "undefined" &&
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== ""
  );


// Hold a reference to the current auth state change listener
let authListener: ((user: AppUser | null) => void) | null = null;
// Hold currently active mock user session
let currentMockUser: AppUser | null = null;

// --------------------------------------------------------------------------
// Local Storage Mock Helpers (Offline / Zero-Config Mode)
// --------------------------------------------------------------------------

// Read all mock users stored in localStorage
const getMockUsers = (): Record<string, any> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("mock_users") || "{}");
  } catch {
    return {};
  }
};

// Save updated mock user registry to localStorage
const saveMockUsers = (users: Record<string, any>) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("mock_users", JSON.stringify(users));
  }
};

// Read the current mock user session from localStorage
const getActiveMockSession = (): AppUser | null => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("mock_session") || "null");
  } catch {
    return null;
  }
};

// Write the current mock user session to localStorage
const saveActiveMockSession = (user: AppUser | null) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("mock_session", JSON.stringify(user));
  }
};

// --------------------------------------------------------------------------
// Auth Service Functions
// --------------------------------------------------------------------------

/**
 * initAuth — Subscribe to real-time auth state changes.
 * Fires immediately with the current user (or null), and again on every login/logout.
 */
export async function initAuth(onUserChanged: (user: AppUser | null) => void) {
  authListener = onUserChanged;

  if (isSupabaseEnabled()) {
    // Dynamically import Supabase client (browser-only)
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();

    // Subscribe to auth state changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        onUserChanged({
          uid: session.user.id,
          email: session.user.email || "",
          displayName:
            session.user.user_metadata?.display_name ||
            session.user.email?.split("@")[0] ||
            "Genie User",
          isMock: false,
        });
      } else {
        onUserChanged(null); // User is logged out
      }
    });

    // Also check current session on first load (in case already logged in)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      onUserChanged({
        uid: session.user.id,
        email: session.user.email || "",
        displayName:
          session.user.user_metadata?.display_name ||
          session.user.email?.split("@")[0] ||
          "Genie User",
        isMock: false,
      });
    }
  } else {
    // Offline mode: restore session from localStorage
    const activeUser = getActiveMockSession();
    currentMockUser = activeUser;
    onUserChanged(activeUser);
  }
}

/**
 * signIn — Sign in with Email & Password
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (isSupabaseEnabled()) {
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      user: {
        uid: data.user.id,
        email: data.user.email || email,
        displayName:
          data.user.user_metadata?.display_name || email.split("@")[0],
        isMock: false,
      },
    };
  }

  // Offline mock sign-in
  const users = getMockUsers();
  const cleanEmail = email.toLowerCase().trim();
  const user = users[cleanEmail];
  if (!user || user.password !== password) {
    return { success: false, error: "Invalid email or password." };
  }
  const sessionUser: AppUser = {
    uid: user.uid,
    email: cleanEmail,
    displayName: user.displayName,
    isMock: true,
  };
  currentMockUser = sessionUser;
  saveActiveMockSession(sessionUser);
  if (authListener) authListener(sessionUser);
  return { success: true, user: sessionUser };
}

/**
 * signUp — Register a new user
 */
export async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  if (isSupabaseEnabled()) {
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email.split("@")[0] } },
    });
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      user: {
        uid: data.user?.id || "",
        email: data.user?.email || email,
        displayName: displayName || email.split("@")[0],
        isMock: false,
      },
    };
  }

  // Offline mock registration
  const users = getMockUsers();
  const cleanEmail = email.toLowerCase().trim();
  if (users[cleanEmail]) {
    return { success: false, error: "Email is already registered." };
  }
  const newUser = {
    uid: "mock_" + Math.random().toString(36).substring(2, 11),
    email: cleanEmail,
    password,
    displayName: displayName || cleanEmail.split("@")[0],
  };
  users[cleanEmail] = newUser;
  saveMockUsers(users);
  const sessionUser: AppUser = {
    uid: newUser.uid,
    email: cleanEmail,
    displayName: newUser.displayName,
    isMock: true,
  };
  currentMockUser = sessionUser;
  saveActiveMockSession(sessionUser);
  if (authListener) authListener(sessionUser);
  return { success: true, user: sessionUser };
}

/**
 * signInWithGoogle — OAuth sign-in via Google
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (isSupabaseEnabled()) {
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) return { success: false, error: error.message };
    return { success: true }; // Redirect will handle the rest
  }
  return {
    success: false,
    error:
      "Google Sign-In requires Supabase mode. Add NEXT_PUBLIC_SUPABASE_URL to your .env file.",
  };
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
  // Offline mock sign-out
  currentMockUser = null;
  saveActiveMockSession(null);
  if (authListener) authListener(null);
  return { success: true };
}
