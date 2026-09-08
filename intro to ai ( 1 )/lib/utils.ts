/**
 * Helper utility functions
 */

import { HistoryItem, HistorySession } from "./types";

export type MessageSource = {
  url: string;
  title?: string;
};

interface MessageWithContent {
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}

interface MessageWithSources {
  parts?: Array<{ type: string; url?: string; title?: string }>;
}

/**
 * Automatically adjusts the height of a textarea based on its scroll content.
 */
export function autoResizeTextarea(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) return;

  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

/**
 * Formats a UNIX timestamp into a readable date and time string (e.g., "Sep 8, 09:30 PM").
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Extracts plain text from a chat message.
 * Handles both legacy string content and modern stream message parts.
 */
export function getMessageText(message: MessageWithContent): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text || "")
      .join("");
  }

  return "";
}

/**
 * Extracts up to 4 unique citation source URLs from a message's stream parts.
 */
export function getMessageSources(message: MessageWithSources): MessageSource[] {
  if (!Array.isArray(message.parts)) {
    return [];
  }

  const seenUrls = new Set<string>();
  const sources: MessageSource[] = [];

  for (const part of message.parts) {
    const isSourceUrl = part.type === "source-url" && Boolean(part.url);

    if (isSourceUrl && part.url && !seenUrls.has(part.url)) {
      seenUrls.add(part.url);
      sources.push({ url: part.url, title: part.title });
    }

    if (sources.length >= 4) {
      break;
    }
  }

  return sources;
}

/**
 * Groups per-turn chat history items into conversation sessions for the sidebar,
 * ordered from newest to oldest.
 */
export function groupHistoryBySession(history: HistoryItem[]): HistorySession[] {
  // 1. Group history items by sessionId
  const sessionGroups = new Map<string, HistoryItem[]>();

  for (const item of history) {
    const existingGroup = sessionGroups.get(item.sessionId);

    if (existingGroup) {
      existingGroup.push(item);
    } else {
      sessionGroups.set(item.sessionId, [item]);
    }
  }

  // 2. Build session summaries: initial prompt as title, newest activity as timestamp
  const sessions: HistorySession[] = [];

  for (const [sessionId, items] of sessionGroups) {
    const oldestItem = items.reduce((earliest, current) =>
      current.timestamp < earliest.timestamp ? current : earliest
    );
    const newestItem = items.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );

    sessions.push({
      sessionId,
      title: oldestItem.prompt,
      lastTimestamp: newestItem.timestamp,
    });
  }

  // 3. Sort sessions with most recently active first
  return sessions.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}

