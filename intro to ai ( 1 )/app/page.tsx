"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { GiftForm } from "@/components/GiftForm";
import { OutputDisplay } from "@/components/OutputDisplay";
import { AuthModal } from "@/components/AuthModal";
import { LocationModal } from "@/components/LocationModal";
import { initAuth, signOut } from "@/lib/auth";
import { saveConversation, getConversationHistory } from "@/lib/db";
import { getMessageText, groupHistoryBySession } from "@/lib/utils";
import { AppUser, HistoryItem } from "@/lib/types";
import { UserLocation, getStoredLocation, setStoredLocation, detectLocation } from "@/lib/location";

export default function Home() {
  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);

  const userRef = useRef<AppUser | null>(null);
  userRef.current = user;

  const locationRef = useRef<UserLocation | null>(null);
  locationRef.current = location;

  const lastPromptRef = useRef<string>("");
  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" ? crypto.randomUUID() : `session-${Date.now()}`
  );

  // --------------------------------------------------------------------------
  // HISTORY
  // --------------------------------------------------------------------------
  const refreshHistory = useCallback(async (userId: string) => {
    try {
      const items = await getConversationHistory(userId);
      setHistory(items);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  useEffect(() => {
    initAuth((activeUser) => {
      setUser(activeUser);
      refreshHistory(activeUser ? activeUser.uid : "guest");
    });
  }, [refreshHistory]);

  // --------------------------------------------------------------------------
  // LOCATION
  // --------------------------------------------------------------------------
  useEffect(() => {
    const stored = getStoredLocation();
    if (stored) {
      setLocation(stored);
      return;
    }
    // No stored preference yet — detect once via IP, silently. A failed
    // detection just leaves location unset; the model asks for it in chat.
    detectLocation().then((detected) => {
      if (detected) {
        setLocation(detected);
        setStoredLocation(detected);
      }
    });
  }, []);

  const handleSaveLocation = (loc: UserLocation | null) => {
    setLocation(loc);
    setStoredLocation(loc);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setHistory([]);
  };

  // --------------------------------------------------------------------------
  // CHAT (Vercel AI SDK)
  // --------------------------------------------------------------------------
  const transportRef = useRef(new DefaultChatTransport({ api: "/api/gift" }));

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
  } = useChat({
    transport: transportRef.current,
    onFinish: async ({ message }) => {
      const activeUser = userRef.current;
      const targetUserId = activeUser ? activeUser.uid : "guest";
      const assistantText = getMessageText(message);
      const promptToSave = lastPromptRef.current || "Gift Genie Wish";

      try {
        await saveConversation(targetUserId, sessionIdRef.current, promptToSave, assistantText);
        refreshHistory(targetUserId);
      } catch (saveErr) {
        console.error("Failed to auto-save wish:", saveErr);
      }
    },
    onError: (err) => {
      console.error("Chat error:", err);
      setChatError(err?.message || "Something went wrong. Please try again.");
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------
  const handleNewChat = () => {
    sessionIdRef.current = typeof crypto !== "undefined" ? crypto.randomUUID() : `session-${Date.now()}`;
    setMessages([]);
    setPrompt("");
    setChatError(null);
  };

  const handleSelectHistory = (sessionId: string) => {
    const turns = history
      .filter((item) => item.sessionId === sessionId)
      .sort((a, b) => a.timestamp - b.timestamp);

    setMessages(
      turns.flatMap((turn, idx) => [
        {
          id: `user-${sessionId}-${idx}`,
          role: "user",
          parts: [{ type: "text", text: turn.prompt }],
        },
        {
          id: `asst-${sessionId}-${idx}`,
          role: "assistant",
          parts: [{ type: "text", text: turn.responseText }],
        },
      ]) as any
    );
    sessionIdRef.current = sessionId;
    setPrompt("");
    setChatError(null);
  };

  const submitPrompt = async (text: string) => {
    const cleanPrompt = text.trim();
    if (!cleanPrompt || isLoading) return;

    setChatError(null);
    lastPromptRef.current = cleanPrompt;
    setPrompt("");
    await sendMessage({ text: cleanPrompt }, { body: { location: locationRef.current } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPrompt(prompt);
  };

  const handleRetry = () => {
    if (lastPromptRef.current) submitPrompt(lastPromptRef.current);
  };

  // Derived values for display
  const userInitial = (user?.displayName || user?.email || "Y").charAt(0).toUpperCase();
  const sessions = groupHistoryBySession(history);

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onNewChat={handleNewChat}
        sessions={sessions}
        onSelectHistory={handleSelectHistory}
      />

      {/* Main App */}
      <div className="app-container">
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          locationLabel={location?.city}
          onOpenLocation={() => setIsLocationModalOpen(true)}
        />

        <main className="main-content">
          {/* Conversation Thread */}
          <OutputDisplay
            messages={messages as any}
            isStreaming={isLoading}
            userInitial={userInitial}
            userAvatarUrl={user?.avatarUrl}
          />

          {chatError && (
            <div className="chat-error-banner" role="alert">
              <span>{chatError}</span>
              <button type="button" onClick={handleRetry}>Retry</button>
            </div>
          )}

          {/* Chat Input */}
          <GiftForm
            prompt={prompt}
            onChangePrompt={setPrompt}
            onSubmit={handleSubmit}
            onSubmitText={submitPrompt}
            isLoading={isLoading}
            onStop={stop}
            hasMessages={messages.length > 0}
          />
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        location={location}
        onSave={handleSaveLocation}
      />
    </div>
  );
}
