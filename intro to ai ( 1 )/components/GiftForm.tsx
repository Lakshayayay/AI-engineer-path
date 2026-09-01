"use client";

import React, { useRef, useEffect } from "react";
import { autoResizeTextarea } from "@/lib/utils";

interface GiftFormProps {
  prompt: string;
  onChangePrompt: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  hasResult: boolean;
}

/**
 * ==============================================================================
 * GIFT FORM & MAGIC LAMP COMPONENT
 * ==============================================================================
 * - Auto-resizes the textarea as the user types.
 * - Supports keyboard shortcut (Ctrl/Cmd + Enter) to submit.
 * - Displays the animated magical genie lamp with "Rub the Lamp" / "Summoning..." states.
 */
export const GiftForm: React.FC<GiftFormProps> = ({
  prompt,
  onChangePrompt,
  onSubmit,
  isLoading,
  hasResult,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize input box whenever prompt content changes
  useEffect(() => {
    autoResizeTextarea(textareaRef.current);
  }, [prompt]);

  // Submit on Ctrl+Enter or Cmd+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isLoading && prompt.trim()) {
        onSubmit(e as any);
      }
    }
  };

  return (
    <form className="gift-form" onSubmit={onSubmit}>
      {/* Textarea Input Section */}
      <div className="input-section">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onChangePrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., My friend who loves hiphop music has a birthday coming up in 3 days. 40-60 bucks budget. I live in Seattle..."
            rows={3}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Animated Magic Lamp Submit Button */}
      <div className="lamp-container">
        <button
          type="submit"
          className={`lamp-btn ${isLoading ? "loading" : ""} ${hasResult && !isLoading ? "compact" : ""}`}
          disabled={isLoading || !prompt.trim()}
          aria-label="Rub the Lamp"
        >
          <span className="lamp-icon">
            <img src="/assets/lamp.svg" alt="Magic Lamp" className="lamp-icon-img" />
          </span>
          <span className="lamp-text">
            {isLoading ? "Summoning Gift Ideas..." : "Rub the Lamp"}
          </span>
        </button>
      </div>
    </form>
  );
};
