import type { UIMessage } from "ai";
import type { BrowserConversation, ChatMessage, ConversationSummary } from "@/lib/types";

const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again.";

export async function fetchConversationSummaries(): Promise<ConversationSummary[]> {
  const data = await getJson<{ conversations: ConversationSummary[] }>("/api/conversations");
  return data.conversations;
}

export async function fetchConversation(id: string): Promise<BrowserConversation> {
  const data = await getJson<{ conversation: BrowserConversation }>(`/api/conversations/${id}`);
  return data.conversation;
}

// useChat shows saved messages as UI messages, so wrap each plain line in one text part.
export function toUIMessages(conversationId: string, chatHistory: ChatMessage[]): UIMessage[] {
  return chatHistory.map((message, index) => ({
    id: `${conversationId}-${index}`,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  }));
}

// Every route answers in JSON, and a failed request carries an error message.
export function readErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return FALLBACK_ERROR_MESSAGE;

  // A failed request before streaming arrives as the JSON body text; a stream error arrives as plain text.
  try {
    const body: unknown = JSON.parse(error.message);
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
  } catch {
    // Not JSON, so the message itself is already readable.
  }

  return error.message || FALLBACK_ERROR_MESSAGE;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? String(data.error) : FALLBACK_ERROR_MESSAGE;
    throw new Error(message);
  }

  return data as T;
}
