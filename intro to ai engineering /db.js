import { firebaseConfig } from "./firebase-config.js";
import { isFirebaseEnabled } from "./auth.js";

let firestoreInstance = null;

async function getFirestoreDB() {
  if (firestoreInstance) return firestoreInstance;
  if (!isFirebaseEnabled()) return null;

  try {
    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
    );
    const {
      getFirestore,
      collection,
      addDoc,
      query,
      where,
      getDocs,
      orderBy,
    } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

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

// Save conversation (prompt + suggestions)
export async function saveConversation(userId, prompt, responseText) {
  const fs = await getFirestoreDB();
  const timestamp = Date.now();

  if (fs) {
    try {
      await fs.addDoc(fs.collection(fs.db, "conversations"), {
        userId,
        prompt,
        responseText,
        timestamp,
      });
      return { success: true };
    } catch (error) {
      console.error("Firestore Save Error:", error);
      return { success: false, error: error.message };
    }
  } else {
    // LocalStorage fallback
    try {
      const historyKey = `mock_history_${userId}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
      const id = "hist_" + Math.random().toString(36).substr(2, 9);
      history.unshift({ id, prompt, responseText, timestamp });
      localStorage.setItem(historyKey, JSON.stringify(history));
      return { success: true, id };
    } catch (error) {
      console.error("LocalStorage Save Error:", error);
      return { success: false, error: error.message };
    }
  }
}

// Fetch conversation history sorted by timestamp descending
export async function getConversationHistory(userId) {
  const fs = await getFirestoreDB();

  if (fs) {
    try {
      const conversationsRef = fs.collection(fs.db, "conversations");
      const q = fs.query(
        conversationsRef,
        fs.where("userId", "==", userId),
        fs.orderBy("timestamp", "desc")
      );
      const querySnapshot = await fs.getDocs(q);
      const history = [];
      querySnapshot.forEach((doc) => {
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
      console.error("Firestore Fetch Error:", error);
      // Fallback to local storage if firestore fetch fails (e.g. index build in progress)
      console.warn("Falling back to local storage for user history retrieval.");
      return loadLocalHistory(userId);
    }
  } else {
    return loadLocalHistory(userId);
  }
}

function loadLocalHistory(userId) {
  try {
    const historyKey = `mock_history_${userId}`;
    return JSON.parse(localStorage.getItem(historyKey) || "[]");
  } catch (error) {
    console.error("Error parsing local history:", error);
    return [];
  }
}
