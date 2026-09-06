"use client";

import React from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}

interface OutputDisplayProps {
  messages?: ChatMessage[];
  content?: string;
  isStreaming: boolean;
  isVisible: boolean;
}

function getMessageText(message: ChatMessage): string {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text || "")
      .join("");
  }
  return "";
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

/**
 * ==============================================================================
 * OUTPUT DISPLAY & CONVERSATION THREAD RENDERER
 * ==============================================================================
 * Supports multi-turn dialogue with memory:
 * - Renders user wishes as question bubbles.
 * - Renders Genie recommendations in formatted Markdown cards.
 * - Shows an active blinking cursor (▊) on the streaming message.
 */
export const OutputDisplay: React.FC<OutputDisplayProps> = ({
  messages,
  content,
  isStreaming,
  isVisible,
}) => {
  // Multi-turn conversation rendering (from useChat)
  if (messages && messages.length > 0) {
    return (
      <section className="output-section">
        <div className={`output-container visible ${isStreaming ? "streaming-active" : ""}`}>
          <div className="conversation-thread">
            {messages.map((msg, idx) => {
              const text = getMessageText(msg);
              const isLastAssistant =
                msg.role === "assistant" && idx === messages.length - 1 && isStreaming;

              if (msg.role === "user") {
                return (
                  <div key={msg.id || idx} className="chat-user-message">
                    <span className="chat-user-label">🧞‍♂️ Your Wish</span>
                    <p className="chat-user-text">{text}</p>
                  </div>
                );
              }

              return (
                <div key={msg.id || idx} className="chat-assistant-message">
                  <div
                    className={`output-content ${isLastAssistant ? "active-stream" : ""}`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // Fallback single-turn rendering
  if (!isVisible && !content) return null;

  return (
    <section className="output-section">
      <div
        className={`output-container ${isVisible ? "visible" : ""} ${
          isStreaming ? "streaming-active" : ""
        }`}
      >
        <div
          className="output-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content || "") }}
        />
      </div>
    </section>
  );
};
