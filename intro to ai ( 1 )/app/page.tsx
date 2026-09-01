"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { GiftForm } from "@/components/GiftForm";
import { OutputDisplay } from "@/components/OutputDisplay";
import { AuthModal } from "@/components/AuthModal";
import { initAuth, signOut, isFirebaseEnabled } from "@/lib/auth";
import { saveConversation, getConversationHistory } from "@/lib/db";
import { AppUser, HistoryItem } from "@/lib/types";

/**
 * ==============================================================================
 * MAIN APPLICATION CONTROLLER (React Client Component)
 * ==============================================================================
 * This component coordinates:
 * 1. UI State (Prompts, loading animations, sidebar drawers).
 * 2. Real-time token streaming from /api/gift via the Fetch Streams API.
 * 3. User Authentication state (Firebase Cloud or LocalStorage fallback).
 * 4. Wish History persistence.
 */
export default function Home() {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  
  // Auth & Mode state
  const [user, setUser] = useState<AppUser | null>(null);
  const [isFirebase, setIsFirebase] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // AI Generation & Streaming state
  const [prompt, setPrompt] = useState<string>("");
  const [outputText, setOutputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);     // Lamp animation / button disable
  const [isStreaming, setIsStreaming] = useState<boolean>(false); // Blinking cursor animation
  const [hasResult, setHasResult] = useState<boolean>(false);     // Output container reveal

  // Past Wishes History
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Ref holds active user reference inside async streaming closures
  const userRef = useRef<AppUser | null>(null);
  userRef.current = user;

  // --------------------------------------------------------------------------
  // AUTH & HISTORY LIFECYCLE
  // --------------------------------------------------------------------------

  // Fetch past wishes for the logged-in user
  const refreshHistory = useCallback(async (userId: string) => {
    try {
      const items = await getConversationHistory(userId);
      setHistory(items);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  // Listen to Auth changes on page load
  useEffect(() => {
    setIsFirebase(isFirebaseEnabled());

    initAuth((activeUser) => {
      setUser(activeUser);
      if (activeUser) {
        refreshHistory(activeUser.uid);
      } else {
        setHistory([]);
      }
    });
  }, [refreshHistory]);

  // Handle Logout
  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setHistory([]);
  };

  // Clicking an item from history loads it instantly without re-calling the AI
  const handleSelectHistory = (item: HistoryItem) => {
    setPrompt(item.prompt);
    setOutputText(item.responseText);
    setHasResult(true);
    setIsLoading(false);
    setIsStreaming(false);

    // Scroll smoothly to output
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  // --------------------------------------------------------------------------
  // AI STREAMING REQUEST LIFECYCLE (Fetch Streams API)
  // --------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isLoading) return;

    // 1. Enter Loading State: Animate lamp & prepare output container
    setIsLoading(true);
    setIsStreaming(true);
    setOutputText("");
    setHasResult(true);

    try {
      // 2. Send POST request to our Next.js Route Handler
      const response = await fetch("/api/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: cleanPrompt }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server responded with ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No readable stream received from server.");
      }

      // 3. Attach a Stream Reader to process bytes as they arrive from the server
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode incoming raw binary chunks to UTF-8 string
        const chunkText = decoder.decode(value, { stream: true });
        sseBuffer += chunkText;

        // Parse Server-Sent Events (SSE) format: "data: {"chunk": "..."}\n\n"
        const lines = sseBuffer.split("\n");
        // Keep trailing uncompleted line fragment in buffer
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned) continue;

          if (cleaned.startsWith("data: ")) {
            const dataStr = cleaned.slice(6).trim();

            // Check for completion signal
            if (dataStr === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                accumulated += parsed.chunk;
                // Update React state in real time as each token arrives
                setOutputText(accumulated);
              }
            } catch {
              // Ignore partial JSON parse errors while buffer is accumulating
            }
          }
        }
      }

      // 4. Save the generated wish into database/localStorage if user is logged in
      const currentUser = userRef.current;
      if (currentUser && accumulated.trim()) {
        await saveConversation(currentUser.uid, cleanPrompt, accumulated);
        refreshHistory(currentUser.uid);
      }
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      setOutputText(
        err?.message ||
          "Sorry, I couldn't reach the magical lamp service. Please try again in a bit."
      );
    } finally {
      // 5. Exit Loading State: Restore lamp button and stop blinking cursor
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar for Navigation, Auth profile, and Recent Wishes History */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        isFirebase={isFirebase}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        history={history}
        onSelectHistory={handleSelectHistory}
      />

      {/* Main Content Area */}
      <div className="app-container">
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isFirebase={isFirebase}
        />

        <main className="main-content">
          {/* Input Form & Magic Lamp CTA */}
          <GiftForm
            prompt={prompt}
            onChangePrompt={setPrompt}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            hasResult={hasResult}
          />

          {/* Real-time Streamed Markdown Output */}
          <OutputDisplay
            content={outputText}
            isStreaming={isStreaming}
            isVisible={hasResult || Boolean(outputText)}
          />
        </main>
      </div>

      {/* Auth Modal (Sign In / Register / Google OAuth) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
