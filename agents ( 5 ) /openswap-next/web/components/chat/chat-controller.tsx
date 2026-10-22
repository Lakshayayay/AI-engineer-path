"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { AccountSummary, ConversationSummary, OpenSwapUIMessage } from "@/lib/types";
import {
  deleteConversation,
  fetchConversation,
  fetchConversationSummaries,
  readErrorMessage,
  toUIMessages,
} from "./api-client";
import { BrandHeader } from "./brand-header";
import { ChatSession } from "./chat-session";
import { Sidebar } from "./sidebar";

// Below this width the sidebar becomes a drawer that slides over the page.
const MOBILE_QUERY = "(max-width: 760px)";

interface ChatControllerProps {
  account: AccountSummary;
  starterSwapNames: string[];
  initialSummaries: ConversationSummary[];
}

// The chat on screen. A fresh chat has a new id but is stored only when its first message is sent.
interface ActiveChat {
  id: string;
  messages: OpenSwapUIMessage[];
}

// Owns the chat list, which chat is open and the mobile drawer. Each chat's own state lives in ChatSession.
export function ChatController({ account, starterSwapNames, initialSummaries }: ChatControllerProps) {
  const [summaries, setSummaries] = useState(initialSummaries);
  const [activeChat, setActiveChat] = useState<ActiveChat>(() => freshChat());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  // The drawer exists only on small screens, so a wider screen counts as closed.
  const drawerOpen = isMobile && sidebarOpen;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // The drawer locks page scroll and moves focus in on open, and back to the toggle on close.
  useEffect(() => {
    document.body.classList.toggle("sidebar-open", drawerOpen);
    if (drawerOpen) closeRef.current?.focus();
    else if (wasOpen.current) toggleRef.current?.focus();
    wasOpen.current = drawerOpen;
  }, [drawerOpen]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);

  // A fresh chat only clears the screen. Nothing is stored until the first send.
  function startNewChat() {
    if (isBusy) return;

    setLoadError(null);
    setActiveChat(freshChat());
    setSidebarOpen(false);
  }

  async function openConversation(id: string) {
    if (isBusy) return;

    try {
      const conversation = await fetchConversation(id);
      setLoadError(null);
      setActiveChat({ id, messages: toUIMessages(id, conversation.chatHistory) });
    } catch (error: unknown) {
      setLoadError(readErrorMessage(error));
    }
    setSidebarOpen(false);
  }

  // Ask first, because a deleted chat can't be brought back. Deleting the open chat starts a fresh one.
  async function removeConversation(id: string) {
    if (isBusy || isDeleting) return;

    const title = summaries.find((summary) => summary.id === id)?.title ?? "this chat";
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;

    setIsDeleting(true);
    try {
      await deleteConversation(id);
      setSummaries((current) => current.filter((summary) => summary.id !== id));
      setLoadError(null);
      if (id === activeChat.id) setActiveChat(freshChat());
    } catch (error: unknown) {
      setLoadError(readErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  // The server names the chat, so reload the list to show the new title and order.
  const refreshSummaries = useCallback(async () => {
    try {
      setSummaries(await fetchConversationSummaries());
    } catch (error: unknown) {
      console.error("Could not refresh the chat list:", error);
    }
  }, []);

  return (
    <div className="conversation-shell">
      <Sidebar
        summaries={summaries}
        activeConversationId={summaries.some((summary) => summary.id === activeChat.id) ? activeChat.id : null}
        disabled={isBusy || isDeleting}
        inert={isMobile && !drawerOpen}
        closeButtonRef={closeRef}
        onOpenConversation={openConversation}
        onDeleteConversation={removeConversation}
        onNewConversation={startNewChat}
        onClose={() => setSidebarOpen(false)}
      />

      {/* While the drawer is open, the page behind it can't take focus. */}
      <main className="app-shell" inert={drawerOpen}>
        <BrandHeader
          account={account}
          sidebarOpen={drawerOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          toggleRef={toggleRef}
        />

        {loadError && <div className="history-turn error-turn">{loadError}</div>}

        <ChatSession
          key={activeChat.id}
          chatId={activeChat.id}
          initialMessages={activeChat.messages}
          starterSwapNames={starterSwapNames}
          onBusyChange={setIsBusy}
          onTurnFinished={refreshSummaries}
        />
      </main>
    </div>
  );
}

function freshChat(): ActiveChat {
  return { id: crypto.randomUUID(), messages: [] };
}

// Follows the screen width, and answers "not mobile" while the page renders on the server.
function useIsMobile(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(MOBILE_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}
