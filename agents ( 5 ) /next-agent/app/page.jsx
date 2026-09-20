"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import ChatMessage from "../components/ChatMessage";
import { CornerDownLeft, Loader2 } from "lucide-react";

export default function ChatPage() {
  const { messages, input, setInput, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      initialMessages: [
        {
          id: "welcome-1",
          role: "assistant",
          content: "System initialized. Autonomous agent standing by.",
        },
      ],
    });

  const conversationEndRef = useRef(null);

  // Auto-scroll to bottom whenever new tokens or messages arrive
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  };

  return (
    <main className="flex flex-col h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
      {/* Subtle Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-900/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <h1 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Agent Session
          </h1>
        </div>
        <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          v1.0.0
        </div>
      </header>

      {/* Conversation Area */}
      <section className="flex-1 overflow-y-auto w-full pb-32">
        <div className="w-full">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <div className="flex gap-6 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 text-sm text-zinc-400">
              <div className="flex-shrink-0 w-6 flex justify-end pt-0.5">
                 <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest opacity-50">AI</span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span className="font-mono text-xs">processing...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 text-sm text-red-600 dark:text-red-400 font-mono text-xs">
              Error: {error.message || "An unexpected error occurred."}
            </div>
          )}
          
          <div ref={conversationEndRef} />
        </div>
      </section>

      {/* Input Form */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-[#09090b] dark:via-[#09090b] dark:to-transparent pt-10 pb-6 px-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative flex items-end rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-sm transition-all focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
        >
          <textarea
            name="user-input"
            placeholder="Instruct the agent..."
            value={input || ""}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoFocus
            rows={1}
            className="flex-1 max-h-32 min-h-[44px] px-4 py-3 bg-transparent border-none focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 w-full resize-none leading-relaxed"
          />
          <div className="p-2 shrink-0">
            <button
              type="submit"
              disabled={isLoading || !(input || "").trim()}
              className="p-1.5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              aria-label="Send"
            >
              <CornerDownLeft size={16} strokeWidth={2.5} />
            </button>
          </div>
        </form>
        <div className="max-w-3xl mx-auto text-center mt-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Shift + Enter for new line
          </span>
        </div>
      </div>
    </main>
  );
}
