"use client";

import React, { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { getMessageText } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}

interface OutputDisplayProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  userInitial: string;
  userAvatarUrl?: string;
}

function renderMarkdown(rawText: string): string {
  if (!rawText) return "";
  try {
    const rawHtml = marked.parse(rawText) as string;
    if (typeof window !== "undefined") {
      return DOMPurify.sanitize(rawHtml);
    }
    return rawHtml;
  } catch (err) {
    console.error("Markdown parsing error:", err);
    return rawText;
  }
}

const SCROLL_BOTTOM_THRESHOLD = 120;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <button
      type="button"
      className="bubble-copy-btn"
      onClick={handleCopy}
      aria-label="Copy response"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * Conversation Thread Renderer
 * Shows user messages with avatars, assistant messages with genie icon,
 * and a typing indicator while waiting for the first tokens.
 */
export const OutputDisplay: React.FC<OutputDisplayProps> = ({
  messages,
  isStreaming,
  userInitial,
  userAvatarUrl,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content, but never fight the user once
  // they've scrolled up to read earlier messages.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < SCROLL_BOTTOM_THRESHOLD) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) return null;

  return (
    <section className="conversation-section" ref={scrollContainerRef}>
      <div className="conversation-thread" aria-live="polite">
        {messages.map((msg, idx) => {
          const text = getMessageText(msg);
          const isLastAssistant =
            msg.role === "assistant" && idx === messages.length - 1 && isStreaming;

          if (msg.role === "user") {
            return (
              <div key={msg.id || idx} className="chat-bubble chat-bubble-user">
                <div className="bubble-content">
                  <p className="bubble-text">{text}</p>
                </div>
                <div className="bubble-avatar user-bubble-avatar">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="You" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
              </div>
            );
          }

          // Assistant message — show typing indicator if empty and streaming
          if (isLastAssistant && !text.trim()) {
            return (
              <div key={msg.id || idx} className="chat-bubble chat-bubble-assistant">
                <div className="bubble-avatar assistant-bubble-avatar">
                  <img src="/assets/genie.svg" alt="Genie" />
                </div>
                <div className="bubble-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id || idx} className="chat-bubble chat-bubble-assistant">
              <div className="bubble-avatar assistant-bubble-avatar">
                <img src="/assets/genie.svg" alt="Genie" />
              </div>
              <div className="bubble-content">
                <div
                  className={`bubble-markdown ${isLastAssistant ? "active-stream" : ""}`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
                />
                {!isLastAssistant && text.trim() && <CopyButton text={text} />}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </section>
  );
};
