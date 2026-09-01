"use client"; // Marks this as a Client Component for browser interactivity and state management

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { GiftForm } from "@/components/GiftForm";
import { OutputDisplay } from "@/components/OutputDisplay";
import { AuthModal } from "@/components/AuthModal";
import { initAuth, signOut, isFirebaseEnabled } from "@/lib/auth";
import { saveConversation, getConversationHistory } from "@/lib/db";
import { AppUser, HistoryItem } from "@/lib/types";

export default function Home() {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------

  // Stores current logged-in user profile (or null if guest)
  const [user, setUser] = useState<AppUser | null>(null);

  // Tracks if Firebase is active (true) or running in local offline mode (false)
  const [isFirebase, setIsFirebase] = useState<boolean>(false);

  // Controls visibility of the login/register popup modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Controls opening and closing of the mobile sidebar drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Holds the user's typed prompt in the textarea
  const [prompt, setPrompt] = useState<string>("");

  // Holds the AI's generated response text (accumulates token-by-token)
  const [outputText, setOutputText] = useState<string>("");

  // Controls the submit button disable state and animated lamp loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Controls the blinking streaming cursor (▊) while receiving tokens
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Controls showing/revealing the output result card on screen
  const [hasResult, setHasResult] = useState<boolean>(false);

  // Stores the list of previous saved wishes in the sidebar
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Ref container holding the latest user object to avoid stale closures during streaming
  const userRef = useRef<AppUser | null>(null);
  userRef.current = user; // Continuously keep ref in sync with active user state

  // --------------------------------------------------------------------------
  // AUTH & HISTORY LIFECYCLE
  // --------------------------------------------------------------------------

  // Memoized function to fetch saved wishes from DB/localStorage for a given user
  const refreshHistory = useCallback(async (userId: string) => {
    try {
      const items = await getConversationHistory(userId); // Fetch from database service
      setHistory(items); // Update history state list
    } catch (err) {
      console.error("Failed to load history:", err); // Log error if database fails
    }
  }, []);

  // Effect that runs once when the page first loads
  useEffect(() => {
    setIsFirebase(isFirebaseEnabled()); // Check if Firebase credentials exist

    // Start listening to auth state changes (login, signup, logout)
    initAuth((activeUser) => {
      setUser(activeUser); // Update active user state
      if (activeUser) {
        refreshHistory(activeUser.uid); // Fetch history if user is signed in
      } else {
        setHistory([]); // Clear history list if logged out
      }
    });
  }, [refreshHistory]);

  // Logs the user out and clears state
  const handleLogout = async () => {
    await signOut(); // Clear auth session
    setUser(null); // Reset user state
    setHistory([]); // Clear history list
  };

  // Clicking an item from history loads it instantly without calling OpenAI
  const handleSelectHistory = (item: HistoryItem) => {
    setPrompt(item.prompt); // Set input box to past question
    setOutputText(item.responseText); // Set output box to saved response
    setHasResult(true); // Reveal the output card
    setIsLoading(false); // Make sure loading spinner is off
    setIsStreaming(false); // Make sure cursor isn't blinking

    // Smoothly scroll down to output on smaller screens
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  // --------------------------------------------------------------------------
  // AI STREAMING REQUEST LIFECYCLE (Fetch Streams API)
  // --------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent standard browser form refresh
    const cleanPrompt = prompt.trim(); // Remove surrounding whitespace
    if (!cleanPrompt || isLoading) return; // Ignore if prompt is empty or already loading

    // 1. Enter Loading State
    setIsLoading(true); // Disable submit button & start lamp animation
    setIsStreaming(true); // Turn on blinking cursor
    setOutputText(""); // Clear any old output text
    setHasResult(true); // Make the output container visible

    try {
      // 2. Send POST request to our Next.js Route Handler (/api/gift)
      const response = await fetch("/api/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // Specify JSON format
        body: JSON.stringify({ userPrompt: cleanPrompt }), // Send prompt in request body
      });

      // Throw error if server returns non-200 status code
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server responded with ${response.status}`);
      }

      // Ensure stream body exists on response
      if (!response.body) {
        throw new Error("No readable stream received from server.");
      }

      // 3. Attach a Stream Reader to read incoming binary bytes progressively
      const reader = response.body.getReader(); // Get reader from standard stream
      const decoder = new TextDecoder(); // Converts raw bytes to string characters
      let accumulated = ""; // Stores the full incoming text
      let sseBuffer = ""; // Buffer to handle partial network chunks

      // Loop continuously while data is streaming
      while (true) {
        const { done, value } = await reader.read(); // Read next chunk from network
        if (done) break; // Exit loop when stream is finished

        // Decode bytes to text string
        const chunkText = decoder.decode(value, { stream: true });
        sseBuffer += chunkText; // Append to stream buffer

        // Split by newlines to process SSE events
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || ""; // Retain incomplete trailing line in buffer

        // Process each complete SSE line
        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned) continue; // Skip empty lines

          // Check for standard SSE prefix "data: "
          if (cleaned.startsWith("data: ")) {
            const dataStr = cleaned.slice(6).trim(); // Extract JSON payload after "data: "

            // Check if server sent completion signal
            if (dataStr === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(dataStr); // Parse chunk JSON object
              if (parsed.chunk) {
                accumulated += parsed.chunk; // Add word to full text
                setOutputText(accumulated); // Update React state live on each token!
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunk fragments
            }
          }
        }
      }

      // 4. Save generated wish to history database if user is logged in
      const currentUser = userRef.current;
      if (currentUser && accumulated.trim()) {
        await saveConversation(currentUser.uid, cleanPrompt, accumulated); // Save to Firestore/localStorage
        refreshHistory(currentUser.uid); // Refresh sidebar history list
      }
    } catch (err: any) {
      console.error("AI Generation Error:", err); // Log error in console
      setOutputText(
        err?.message ||
          "Sorry, I couldn't reach the magical lamp service. Please try again in a bit."
      );
    } finally {
      // 5. Exit Loading State
      setIsLoading(false); // Re-enable submit button
      setIsStreaming(false); // Stop blinking cursor
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar for Navigation, User Profile, and Saved History */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)} // Close sidebar on mobile
        user={user} // Pass active user profile
        isFirebase={isFirebase} // Pass mode flag
        onOpenAuth={() => setIsAuthModalOpen(true)} // Open auth modal
        onLogout={handleLogout} // Pass logout action
        history={history} // Pass saved history list
        onSelectHistory={handleSelectHistory} // Handle clicking a history item
      />

      {/* Main App Container */}
      <div className="app-container">
        {/* Top Header with title and mobile menu toggle */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isFirebase={isFirebase}
        />

        <main className="main-content">
          {/* User Input Textarea and Magic Lamp CTA Button */}
          <GiftForm
            prompt={prompt}
            onChangePrompt={setPrompt} // Update prompt state on typing
            onSubmit={handleSubmit} // Trigger AI stream on submit
            isLoading={isLoading} // Loading animation state
            hasResult={hasResult} // Compact button state
          />

          {/* Real-time Streamed Markdown Output Card */}
          <OutputDisplay
            content={outputText} // Pass accumulated response text
            isStreaming={isStreaming} // Control blinking cursor
            isVisible={hasResult || Boolean(outputText)} // Visibility flag
          />
        </main>
      </div>

      {/* Authentication Modal Dialog (Sign In / Register / Google OAuth) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)} // Close modal
      />
    </div>
  );
}
