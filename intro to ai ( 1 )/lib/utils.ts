/**
 * Helper utility functions
 */

import { HistoryItem, HistorySession } from "./types";

export function autoResizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Extract plain text from a useChat message, whichever shape it arrives in
// (legacy `content` string, or the current `parts` array).
export function getMessageText(message: {
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}): string {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text || "")
      .join("");
  }
  return "";
}

export type MessageSource = { url: string; title?: string };

// Pull deduped source-url parts off a message (populated when the server sets
// sendSources: true on the stream). Mirrors getMessageText's tolerance for
// messages arriving in different shapes.
export function getMessageSources(message: {
  parts?: Array<{ type: string; url?: string; title?: string }>;
}): MessageSource[] {
  if (!Array.isArray(message.parts)) return [];
  const seen = new Set<string>();
  const out: MessageSource[] = [];
  for (const p of message.parts) {
    if (p.type !== "source-url" || !p.url || seen.has(p.url)) continue;
    seen.add(p.url);
    out.push({ url: p.url, title: p.title });
  }
  return out.slice(0, 4); // keep the row subtle
}

// Collapse flat per-turn history rows into one row per conversation for the
// sidebar, newest first.
export function groupHistoryBySession(history: HistoryItem[]): HistorySession[] {
  const bySession = new Map<string, HistoryItem[]>();
  for (const item of history) {
    const bucket = bySession.get(item.sessionId);
    if (bucket) bucket.push(item);
    else bySession.set(item.sessionId, [item]);
  }

  const sessions: HistorySession[] = [];
  for (const [sessionId, items] of bySession) {
    const oldest = items.reduce((a, b) => (a.timestamp < b.timestamp ? a : b));
    const newest = items.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
    sessions.push({ sessionId, title: oldest.prompt, lastTimestamp: newest.timestamp });
  }

  return sessions.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}
