"use client";

import React, { useRef, useEffect } from "react";
import { autoResizeTextarea } from "@/lib/utils";

interface GiftFormProps {
  prompt: string;
  onChangePrompt: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSubmitText: (text: string) => void;
  isLoading: boolean;
  onStop: () => void;
  hasMessages: boolean;
}

const SUGGESTIONS = [
  "Birthday gift for a friend, budget under $50",
  "Anniversary gift, something thoughtful",
  "Coworker leaving the team, small budget",
  "Last-minute gift, needs to arrive tomorrow",
];

/**
 * Chat Input Component
 * Professional chat-style input with inline send arrow.
 * Enter to send, Shift+Enter for newline.
 */
export const GiftForm: React.FC<GiftFormProps> = ({
  prompt,
  onChangePrompt,
  onSubmit,
  onSubmitText,
  isLoading,
  onStop,
  hasMessages,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    autoResizeTextarea(textareaRef.current);
  }, [prompt]);

  // Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && prompt.trim()) {
        onSubmit(e as any);
      }
    }
  };

  return (
    <div className={`chat-input-area ${hasMessages ? "pinned" : ""}`}>
      {/* Welcome hero when no messages */}
      {!hasMessages && (
        <div className="welcome-hero">
          <img src="/assets/lamp.svg" alt="Magic Lamp" className="welcome-lamp" />
          <h2 className="welcome-title">What gift can I help you find?</h2>
          <p className="welcome-subtitle">
            Describe the person, occasion, budget, and location — I'll craft hyper-personalized recommendations.
          </p>
          <div className="suggestion-chips">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="suggestion-chip"
                onClick={() => onSubmitText(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="chat-input-form" onSubmit={onSubmit}>
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onChangePrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasMessages ? "Ask a follow-up..." : "e.g., My friend loves hip-hop, birthday in 3 days, $40-60 budget, Seattle..."}
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              type="button"
              className="send-btn active"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              className={`send-btn ${prompt.trim() ? "active" : ""}`}
              disabled={!prompt.trim()}
              aria-label="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        <span className="input-hint">
          Enter to send · Shift+Enter for new line
        </span>
      </form>
    </div>
  );
};
