import { firebaseConfig } from "./firebase-config.js";

let firebaseInstance = null;
let currentMockUser = null;
let authListener = null;

// Determine if Firebase is enabled based on the config
export const isFirebaseEnabled = () => {
  return (
    firebaseConfig &&
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.apiKey.trim() !== ""
  );
};

// Initialize Firebase dynamically if enabled
async function getFirebase() {
  if (firebaseInstance) return firebaseInstance;
  if (!isFirebaseEnabled()) return null;

  try {
    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
    );
    const {
      getAuth,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut: fbSignOut,
      GoogleAuthProvider,
      signInWithPopup,
      onAuthStateChanged,
    } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

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

// Local mock storage helpers
const getMockUsers = () => JSON.parse(localStorage.getItem("mock_users") || "{}");
const saveMockUsers = (users) => localStorage.setItem("mock_users", JSON.stringify(users));
const getActiveMockSession = () => JSON.parse(localStorage.getItem("mock_session") || "null");
const saveActiveMockSession = (user) => localStorage.setItem("mock_session", JSON.stringify(user));

export async function initAuth(onUserChanged) {
  authListener = onUserChanged;
  const fb = await getFirebase();

  if (fb) {
    // Real Firebase listener
    fb.onAuthStateChanged(fb.auth, (user) => {
      if (user) {
        onUserChanged({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
          isMock: false,
        });
      } else {
        onUserChanged(null);
      }
    });
  } else {
    // Local mock listener
    const activeUser = getActiveMockSession();
    currentMockUser = activeUser;
    onUserChanged(activeUser);
  }
}

export async function signIn(email, password) {
  const fb = await getFirebase();

  if (fb) {
    try {
      const userCredential = await fb.signInWithEmailAndPassword(fb.auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else {
    // Local mock authentication
    const users = getMockUsers();
    const cleanEmail = email.toLowerCase().trim();
    const user = users[cleanEmail];

    if (!user || user.password !== password) {
      return { success: false, error: "Invalid email or password." };
    }

    const sessionUser = {
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

export async function signUp(email, password, displayName) {
  const fb = await getFirebase();

  if (fb) {
    try {
      const userCredential = await fb.createUserWithEmailAndPassword(fb.auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else {
    // Local mock registration
    const users = getMockUsers();
    const cleanEmail = email.toLowerCase().trim();

    if (users[cleanEmail]) {
      return { success: false, error: "Email is already registered." };
    }

    const newUser = {
      uid: "mock_" + Math.random().toString(36).substr(2, 9),
      email: cleanEmail,
      password: password,
      displayName: displayName || cleanEmail.split("@")[0],
    };

    users[cleanEmail] = newUser;
    saveMockUsers(users);

    const sessionUser = {
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

export async function signInWithGoogle() {
  const fb = await getFirebase();

  if (fb) {
    try {
      const provider = new fb.GoogleAuthProvider();
      const result = await fb.signInWithPopup(fb.auth, provider);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else {
    return {
      success: false,
      error: "Google Sign-In is only available in Firebase Mode. Please configure firebase-config.js first.",
    };
  }
}

export async function signOut() {
  const fb = await getFirebase();

  if (fb) {
    try {
      await fb.signOut(fb.auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else {
    currentMockUser = null;
    saveActiveMockSession(null);
    if (authListener) authListener(null);
    return { success: true };
  }
}
