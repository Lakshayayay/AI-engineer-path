"use client";

import React, { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface OutputDisplayProps {
  content: string;
  isStreaming: boolean;
  isVisible: boolean;
}

/**
 * ==============================================================================
 * OUTPUT DISPLAY & MARKDOWN RENDERER
 * ==============================================================================
 * 1. Takes raw streamed text from the AI.
 * 2. Parses Markdown headers (###), bold tags (**bold**), and lists using `marked`.
 * 3. Sanitizes HTML with `DOMPurify` to protect against XSS injection attacks.
 * 4. Shows an active blinking cursor (▊) while streaming is in progress.
 */
export const OutputDisplay: React.FC<OutputDisplayProps> = ({
  content,
  isStreaming,
  isVisible,
}) => {
  // Re-parse Markdown and sanitize HTML whenever content updates
  const sanitizedHtml = useMemo(() => {
    if (!content) return "";
    try {
      const rawHtml = marked.parse(content) as string;
      if (typeof window !== "undefined") {
        return DOMPurify.sanitize(rawHtml);
      }
      return rawHtml;
    } catch (err) {
      console.error("Markdown parsing error:", err);
      return content;
    }
  }, [content]);

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
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    </section>
  );
};
