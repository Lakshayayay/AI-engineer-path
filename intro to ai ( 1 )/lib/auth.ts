import { firebaseConfig } from "./firebase-config";
import { AppUser, AuthResult } from "./types";

/**
 * ==============================================================================
 * DUAL-MODE AUTHENTICATION SERVICE
 * ==============================================================================
 * Automatically switches between:
 * 1. Real Firebase Auth (when API keys exist in lib/firebase-config.ts).
 * 2. Local Mock Auth (stored in browser localStorage for offline zero-config dev).
 */

let firebaseInstance: any = null;
let currentMockUser: AppUser | null = null;
let authListener: ((user: AppUser | null) => void) | null = null;

// Returns true if valid Firebase credentials are provided
export const isFirebaseEnabled = (): boolean => {
  return (
    typeof window !== "undefined" &&
    Boolean(
      firebaseConfig &&
        firebaseConfig.apiKey &&
        firebaseConfig.apiKey !== "YOUR_API_KEY" &&
        firebaseConfig.apiKey.trim() !== ""
    )
  );
};

// Dynamically loads Firebase Auth SDKs in the browser only when needed
async function getFirebase() {
  if (firebaseInstance) return firebaseInstance;
  if (!isFirebaseEnabled()) return null;

  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js" as any);
    const {
      getAuth,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut: fbSignOut,
      GoogleAuthProvider,
      signInWithPopup,
      onAuthStateChanged,
    } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js" as any);

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    firebaseInstance = {
      auth,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut: fbSignOut,
      GoogleAuthProvider,
      signInWithPopup,
      onAuthStateChanged,
    };
    return firebaseInstance;
  } catch (error) {
    console.error("Error loading Firebase Auth SDKs:", error);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Local Storage Mock Helpers (Offline Mode)
// ----------------------------------------------------------------------------
const getMockUsers = (): Record<string, any> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("mock_users") || "{}");
  } catch {
    return {};
  }
};

const saveMockUsers = (users: Record<string, any>) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("mock_users", JSON.stringify(users));
  }
};

const getActiveMockSession = (): AppUser | null => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("mock_session") || "null");
  } catch {
    return null;
  }
};

const saveActiveMockSession = (user: AppUser | null) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("mock_session", JSON.stringify(user));
  }
};

/**
 * Initialize Authentication State Listener
 * Fires whenever a user signs in, signs up, or logs out.
 */
export async function initAuth(onUserChanged: (user: AppUser | null) => void) {
  authListener = onUserChanged;
  const fb = await getFirebase();

  if (fb) {
    fb.onAuthStateChanged(fb.auth, (user: any) => {
      if (user) {
        onUserChanged({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || user.email?.split("@")[0] || "Genie User",
          isMock: false,
        });
      } else {
        onUserChanged(null);
      }
    });
  } else {
    // Restore session from localStorage in mock mode
    const activeUser = getActiveMockSession();
    currentMockUser = activeUser;
    onUserChanged(activeUser);
  }
}

/**
 * Sign In with Email & Password
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const fb = await getFirebase();

  if (fb) {
    try {
      const userCredential = await fb.signInWithEmailAndPassword(fb.auth, email, password);
      const user: AppUser = {
        uid: userCredential.user.uid,
        email: userCredential.user.email || email,
        displayName: userCredential.user.displayName || email.split("@")[0],
        isMock: false,
      };
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error?.message || "Invalid credentials" };
    }
  } else {
    // Local Mock Authentication
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
}

/**
 * Register a new User
 */
export async function signUp(email: string, password: string, displayName?: string): Promise<AuthResult> {
  const fb = await getFirebase();

  if (fb) {
    try {
      const userCredential = await fb.createUserWithEmailAndPassword(fb.auth, email, password);
      const user: AppUser = {
        uid: userCredential.user.uid,
        email: userCredential.user.email || email,
        displayName: displayName || userCredential.user.displayName || email.split("@")[0],
        isMock: false,
      };
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error?.message || "Registration failed" };
    }
  } else {
    // Local Mock Registration
    const users = getMockUsers();
    const cleanEmail = email.toLowerCase().trim();

    if (users[cleanEmail]) {
      return { success: false, error: "Email is already registered." };
    }

    const newUser = {
      uid: "mock_" + Math.random().toString(36).substring(2, 11),
      email: cleanEmail,
      password: password,
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
}

/**
 * Sign In with Google OAuth
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const fb = await getFirebase();

  if (fb) {
    try {
      const provider = new fb.GoogleAuthProvider();
      const result = await fb.signInWithPopup(fb.auth, provider);
      const user: AppUser = {
        uid: result.user.uid,
        email: result.user.email || "",
        displayName: result.user.displayName || result.user.email?.split("@")[0] || "User",
        isMock: false,
      };
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error?.message || "Google sign-in failed" };
    }
  } else {
    return {
      success: false,
      error: "Google Sign-In requires Firebase mode. Add your credentials in lib/firebase-config.ts first.",
    };
  }
}

/**
 * Sign Out
 */
export async function signOut(): Promise<AuthResult> {
  const fb = await getFirebase();

  if (fb) {
    try {
      await fb.signOut(fb.auth);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || "Sign out failed" };
    }
  } else {
    currentMockUser = null;
    saveActiveMockSession(null);
    if (authListener) authListener(null);
    return { success: true };
  }
}
