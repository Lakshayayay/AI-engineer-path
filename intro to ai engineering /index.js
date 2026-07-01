import { marked } from "marked";
import DOMPurify from "dompurify";
import { autoResizeTextarea, setLoading } from "./utils.js";
import {
  initAuth,
  signIn,
  signUp,
  signInWithGoogle,
  signOut,
  isFirebaseEnabled,
} from "./auth.js";
import { saveConversation, getConversationHistory } from "./db.js";

// UI Elements
const giftForm = document.getElementById("gift-form");
const userInput = document.getElementById("user-input");
const outputContainer = document.getElementById("output-container");
const outputContent = document.getElementById("output-content");

// Sidebar & Menu Elements
const sidebar = document.getElementById("sidebar");
const menuToggleBtn = document.getElementById("menu-toggle-btn");
const closeSidebarBtn = document.getElementById("close-sidebar-btn");
const headerModeIndicator = document.getElementById("header-mode-indicator");

// Auth Elements
const openAuthBtn = document.getElementById("open-auth-btn");
const logoutBtn = document.getElementById("logout-btn");
const guestInfo = document.getElementById("guest-info");
const userInfo = document.getElementById("user-info");
const displayNameText = document.getElementById("display-name-text");
const emailText = document.getElementById("email-text");
const userAvatarInitials = document.getElementById("user-avatar-initials");
const modeBadge = document.getElementById("mode-badge");

// Auth Modal Elements
const authModal = document.getElementById("auth-modal");
const closeAuthBtn = document.getElementById("close-auth-btn");
const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const nameGroup = document.getElementById("name-group");
const authForm = document.getElementById("auth-form");
const authName = document.getElementById("auth-name");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const googleSigninBtn = document.getElementById("google-signin-btn");
const authErrorMsg = document.getElementById("auth-error-msg");

// History Elements
const historyList = document.getElementById("history-list");

// Global App State
let currentUser = null;
let currentAuthTab = "login"; // "login" or "signup"

function start() {
  // Setup textarea resize
  userInput.addEventListener("input", () => autoResizeTextarea(userInput));

  // Gift Form Submit
  giftForm.addEventListener("submit", handleGiftRequest);

  // Sidebar Controls
  menuToggleBtn.addEventListener("click", () => sidebar.classList.add("open"));
  closeSidebarBtn.addEventListener("click", () => sidebar.classList.remove("open"));

  // Open & Close Auth Modal
  openAuthBtn.addEventListener("click", showAuthModal);
  closeAuthBtn.addEventListener("click", hideAuthModal);
  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) hideAuthModal();
  });

  // Auth Tab Switchers
  tabLogin.addEventListener("click", () => switchAuthTab("login"));
  tabSignup.addEventListener("click", () => switchAuthTab("signup"));

  // Auth Form Submission
  authForm.addEventListener("submit", handleAuthSubmit);

  // Google Sign In
  googleSigninBtn.addEventListener("click", handleGoogleSignIn);

  // Logout Button
  logoutBtn.addEventListener("click", handleLogout);

  // Initialize Authentication State
  initAuth(handleAuthStateChange);
}

// ==========================================================================
// Authentication State Handlers
// ==========================================================================

function handleAuthStateChange(user) {
  currentUser = user;

  // Update indicators showing if Firebase is active
  const hasFirebase = isFirebaseEnabled();
  const modeText = hasFirebase ? "Firebase Mode" : "Local Mode";

  headerModeIndicator.textContent = modeText;
  if (modeBadge) {
    modeBadge.textContent = modeText;
    if (hasFirebase) {
      modeBadge.classList.add("firebase");
    } else {
      modeBadge.classList.remove("firebase");
    }
  }

  if (user) {
    // Logged In State
    guestInfo.classList.add("hidden");
    userInfo.classList.remove("hidden");

    // Populate user UI details
    displayNameText.textContent = user.displayName || "Genie User";
    emailText.textContent = user.email || "";
    userAvatarInitials.textContent = (user.displayName || user.email || "U")
      .charAt(0)
      .toUpperCase();

    // Hide Auth Modal if open
    hideAuthModal();

    // Load History
    refreshHistory();
  } else {
    // Logged Out State
    userInfo.classList.add("hidden");
    guestInfo.classList.remove("hidden");

    // Clear History List UI
    historyList.innerHTML = `<p class="empty-history-text">Sign in to see your saved wishes!</p>`;
  }
}

// ==========================================================================
// Auth Forms & Actions
// ==========================================================================

function showAuthModal() {
  authModal.classList.remove("hidden");
  switchAuthTab("login");
  authErrorMsg.classList.add("hidden");
  authForm.reset();
}

function hideAuthModal() {
  authModal.classList.add("hidden");
}

function switchAuthTab(tab) {
  currentAuthTab = tab;
  authErrorMsg.classList.add("hidden");

  if (tab === "login") {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    nameGroup.style.display = "none";
    authSubmitBtn.textContent = "Sign In";
    authName.removeAttribute("required");
  } else {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    nameGroup.style.display = "flex";
    authSubmitBtn.textContent = "Register";
    authName.setAttribute("required", "");
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  authErrorMsg.classList.add("hidden");

  const email = authEmail.value;
  const password = authPassword.value;
  const name = authName.value;

  authSubmitBtn.disabled = true;
  const originalText = authSubmitBtn.textContent;
  authSubmitBtn.textContent = "Processing...";

  let result;
  if (currentAuthTab === "login") {
    result = await signIn(email, password);
  } else {
    result = await signUp(email, password, name);
  }

  authSubmitBtn.disabled = false;
  authSubmitBtn.textContent = originalText;

  if (result.success) {
    hideAuthModal();
  } else {
    authErrorMsg.textContent = result.error || "Authentication failed.";
    authErrorMsg.classList.remove("hidden");
  }
}

async function handleGoogleSignIn() {
  authErrorMsg.classList.add("hidden");
  const result = await signInWithGoogle();
  if (result.success) {
    hideAuthModal();
  } else {
    authErrorMsg.textContent = result.error;
    authErrorMsg.classList.remove("hidden");
  }
}

async function handleLogout() {
  const result = await signOut();
  if (!result.success) {
    alert("Logout failed: " + result.error);
  }
}

// ==========================================================================
// Conversation History Management
// ==========================================================================

async function refreshHistory() {
  if (!currentUser) return;

  try {
    const history = await getConversationHistory(currentUser.uid);
    renderHistoryItems(history);
  } catch (error) {
    console.error("Failed to load history list:", error);
  }
}

function renderHistoryItems(history) {
  if (!history || history.length === 0) {
    historyList.innerHTML = `<p class="empty-history-text">No previous wishes found. Summon some gifts first!</p>`;
    return;
  }

  historyList.innerHTML = "";
  history.forEach((item) => {
    const date = new Date(item.timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemEl = document.createElement("div");
    itemEl.className = "history-item";
    itemEl.innerHTML = `
      <div class="history-item-prompt">${escapeHTML(item.prompt)}</div>
      <div class="history-item-time">${date}</div>
    `;

    itemEl.addEventListener("click", () => {
      // Load selected wish history directly
      userInput.value = item.prompt;
      autoResizeTextarea(userInput);

      // Render answer immediately without server roundtrip
      setLoading(false);
      outputContent.innerHTML = DOMPurify.sanitize(marked.parse(item.responseText));
      outputContainer.classList.remove("hidden");
      outputContainer.classList.add("visible");

      // Scroll to output
      outputContainer.scrollIntoView({ behavior: "smooth" });

      // Close sidebar on mobile
      sidebar.classList.remove("open");
    });

    historyList.appendChild(itemEl);
  });
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================================
// Gift Recommendations Request Lifecycle (Streaming SSE)
// ==========================================================================

async function handleGiftRequest(e) {
  e.preventDefault();

  const userPrompt = userInput.value.trim();
  if (!userPrompt) return;

  // Set loading state (activates animated lamp, updates button label)
  setLoading(true);

  // Prep output elements for streaming
  outputContent.innerHTML = "";
  outputContainer.classList.remove("hidden");
  outputContainer.classList.add("visible");
  outputContainer.classList.add("streaming-active");

  try {
    const response = await fetch("/api/gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userPrompt }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP error ${response.status}`);
    }

    // Read streams chunk-by-chunk using a TextDecoder
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";
    let sseBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode stream chunk
      const chunkText = decoder.decode(value, { stream: true });
      sseBuffer += chunkText;

      // Process SSE message patterns
      const lines = sseBuffer.split("\n");
      // Retain trailing uncompleted line segment in buffer
      sseBuffer = lines.pop();

      for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine) continue;

        if (cleanedLine.startsWith("data: ")) {
          const dataStr = cleanedLine.slice(6).trim();

          if (dataStr === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.chunk) {
              accumulatedText += parsed.chunk;
              // Parse current accumulated text and render safely
              const parsedHtml = marked.parse(accumulatedText);
              outputContent.innerHTML = DOMPurify.sanitize(parsedHtml);
            }
          } catch (e) {
            // Ignore incomplete JSON chunks, let it accumulate
          }
        }
      }
    }

    // Save streaming result in history if user is logged in
    if (currentUser && accumulatedText.trim()) {
      await saveConversation(currentUser.uid, userPrompt, accumulatedText);
      // Reload history list immediately
      refreshHistory();
    }
  } catch (error) {
    console.error("Streaming error:", error);
    outputContent.textContent =
      error.message ||
      "Sorry, I can't access what I need right now. Please try again in a bit.";
  } finally {
    // Always clear loading states
    setLoading(false);
    outputContainer.classList.remove("streaming-active");
  }
}

start();
