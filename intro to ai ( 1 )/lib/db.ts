import { firebaseConfig } from "./firebase-config";
import { isFirebaseEnabled } from "./auth";
import { HistoryItem } from "./types";

/**
 * ==============================================================================
 * DUAL-MODE DATABASE / HISTORY SERVICE
 * ==============================================================================
 * Automatically switches between:
 * 1. Cloud Firestore (when Firebase credentials are provided).
 * 2. Browser LocalStorage (fallback for offline zero-config dev).
 */

let firestoreInstance: any = null;

// Dynamically load Firestore SDK when Firebase mode is enabled
async function getFirestoreDB() {
  if (firestoreInstance) return firestoreInstance;
  if (!isFirebaseEnabled()) return null;

  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js" as any);
    const {
      getFirestore,
      collection,
      addDoc,
      query,
      where,
      getDocs,
      orderBy,
    } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js" as any);

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    firestoreInstance = {
      db,
      collection,
      addDoc,
      query,
      where,
      getDocs,
      orderBy,
    };
    return firestoreInstance;
  } catch (error) {
    console.error("Error loading Firebase Firestore SDKs:", error);
    return null;
  }
}

/**
 * Save a completed wish (Prompt + AI Response) to the database
 */
export async function saveConversation(
  userId: string,
  prompt: string,
  responseText: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const fs = await getFirestoreDB();
  const timestamp = Date.now();

  if (fs) {
    // Save to Cloud Firestore
    try {
      const docRef = await fs.addDoc(fs.collection(fs.db, "conversations"), {
        userId,
        prompt,
        responseText,
        timestamp,
      });
      return { success: true, id: docRef.id };
    } catch (error: any) {
      console.error("Firestore Save Error:", error);
      return { success: false, error: error?.message || "Failed to save conversation" };
    }
  } else {
    // Save to LocalStorage fallback
    try {
      const historyKey = `mock_history_${userId}`;
      const history: HistoryItem[] = JSON.parse(localStorage.getItem(historyKey) || "[]");
      const id = "hist_" + Math.random().toString(36).substring(2, 11);
      // Prepend newest wish to top of list
      history.unshift({ id, prompt, responseText, timestamp });
      localStorage.setItem(historyKey, JSON.stringify(history));
      return { success: true, id };
    } catch (error: any) {
      console.error("LocalStorage Save Error:", error);
      return { success: false, error: error?.message || "Storage error" };
    }
  }
}

/**
 * Fetch all conversation history for a specific user ID
 */
export async function getConversationHistory(userId: string): Promise<HistoryItem[]> {
  const fs = await getFirestoreDB();

  if (fs) {
    // Fetch from Cloud Firestore
    try {
      const conversationsRef = fs.collection(fs.db, "conversations");
      const q = fs.query(
        conversationsRef,
        fs.where("userId", "==", userId),
        fs.orderBy("timestamp", "desc")
      );
      const querySnapshot = await fs.getDocs(q);
      const history: HistoryItem[] = [];
      querySnapshot.forEach((doc: any) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          prompt: data.prompt,
          responseText: data.responseText,
          timestamp: data.timestamp,
        });
      });
      return history;
    } catch (error) {
      console.warn("Firestore Fetch Error, falling back to local storage:", error);
      return loadLocalHistory(userId);
    }
  } else {
    // Fetch from LocalStorage fallback
    return loadLocalHistory(userId);
  }
}

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
