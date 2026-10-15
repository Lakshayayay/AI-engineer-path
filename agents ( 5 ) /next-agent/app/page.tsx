"use client"; // useChat and useEffect only work in the browser

import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

export default function ChatPage() {
  // useChat owns the conversation: it sends messages to /api/chat and fills `messages` as the reply streams in.
  const { messages, input, setInput, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: "System initialized. Autonomous agent standing by.",
      },
    ],
  });

  // Keep the newest message in view: scroll to an empty marker at the bottom whenever anything changes.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <main className="flex flex-col h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-900/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <h1 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Agent Session
          </h1>
        </div>
        <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">v1.0.0</div>
      </header>

      <section className="flex-1 overflow-y-auto w-full pb-32">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 text-zinc-400">
            <Loader2 size={14} className="animate-spin" />
            <span className="font-mono text-xs">processing...</span>
          </div>
        )}

        {error && (
          <p className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 text-red-600 dark:text-red-400 font-mono text-xs">
            Error: {error.message || "An unexpected error occurred."}
          </p>
        )}

        <div ref={bottomRef} />
      </section>

      <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} isLoading={isLoading} />
    </main>
  );
}
