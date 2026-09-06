"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { GiftForm } from "@/components/GiftForm";
import { OutputDisplay } from "@/components/OutputDisplay";
import { AuthModal } from "@/components/AuthModal";
import { initAuth, signOut, isSupabaseEnabled } from "@/lib/auth";
import { saveConversation, getConversationHistory } from "@/lib/db";
import { AppUser, HistoryItem } from "@/lib/types";

export default function Home() {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  const [user, setUser] = useState<AppUser | null>(null);
  const [isSupabase, setIsSupabase] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const userRef = useRef<AppUser | null>(null);
  userRef.current = user;

  // Memoized function to fetch saved wishes from DB/localStorage for a given user
  const refreshHistory = useCallback(async (userId: string) => {
    try {
      const items = await getConversationHistory(userId);
      setHistory(items);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  // Effect that runs once when the page first loads
  useEffect(() => {
    setIsSupabase(isSupabaseEnabled());

    initAuth((activeUser) => {
      setUser(activeUser);
      if (activeUser) {
        refreshHistory(activeUser.uid);
      } else {
        setHistory([]);
      }
    });
  }, [refreshHistory]);

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setHistory([]);
  };

  // --------------------------------------------------------------------------
  // VERCEL AI SDK useChat (Multi-turn conversational memory)
  // --------------------------------------------------------------------------
  const transportRef = useRef(new TextStreamChatTransport({ api: "/api/gift" }));

  // Helper to read text cleanly from an AI message
  const getMessageContent = (msg: any): string => {
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.parts)) {
      return msg.parts.map((p: any) => p.text || "").join("");
    }
    return "";
  };

  const {
    messages,
    setMessages,
    sendMessage,
    status,
  } = useChat({
    transport: transportRef.current,
    onFinish: async ({ message }) => {
      const activeUser = userRef.current;
      const targetUserId = activeUser ? activeUser.uid : "guest";
      const assistantText = getMessageContent(message);

      try {
        await saveConversation(targetUserId, prompt || "Gift Genie Wish", assistantText);
        refreshHistory(targetUserId);
      } catch (saveErr) {
        console.error("Failed to auto-save wish:", saveErr);
      }
    },
    onError: (err) => {
      console.error("Chat error:", err);
      alert(err?.message || "Failed to summon gift ideas. Please try again.");
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Clicking an item from history loads it into the conversation view
  const handleSelectHistory = (item: HistoryItem) => {
    setMessages([
      {
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: item.prompt }],
      } as any,
      {
        id: `asst-${Date.now()}`,
        role: "assistant",
        parts: [{ type: "text", text: item.responseText }],
      } as any,
    ]);
    setPrompt("");
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  // Submitting sends a message into the continuous conversation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isLoading) return;

    setPrompt(""); // Clear input box ready for next follow-up
    await sendMessage({ text: cleanPrompt });
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar for Navigation, User Profile, and Saved History */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        isSupabase={isSupabase}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        history={history}
        onSelectHistory={handleSelectHistory}
      />

      {/* Main App Container */}
      <div className="app-container">
        {/* Top Header with title and mobile menu toggle */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSupabase={isSupabase}
        />

        <main className="main-content">
          {/* Multi-turn Conversation Display */}
          <OutputDisplay
            messages={messages as any}
            isStreaming={isLoading}
            isVisible={messages.length > 0}
          />

          {/* User Input Textarea and Magic Lamp CTA Button */}
          <GiftForm
            prompt={prompt}
            onChangePrompt={setPrompt}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            hasResult={messages.length > 0}
          />
        </main>
      </div>

      {/* Authentication Modal Dialog (Sign In / Register / Google OAuth) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
