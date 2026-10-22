import type { BrowserConversation, ChatMessage, ConversationSummary, OpenSwapUIMessage } from "@/lib/types";

const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again.";

export async function fetchConversationSummaries(): Promise<ConversationSummary[]> {
  const data = await requestJson<{ conversations: ConversationSummary[] }>("/api/conversations");
  return data.conversations;
}

export async function fetchConversation(id: string): Promise<BrowserConversation> {
  const data = await requestJson<{ conversation: BrowserConversation }>(`/api/conversations/${id}`);
  return data.conversation;
}

export async function deleteConversation(id: string): Promise<void> {
  await requestJson<null>(`/api/conversations/${id}`, { method: "DELETE" });
}

export async function savePreferences(preferences: string): Promise<void> {
  await requestJson<{ preferences: string }>("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences }),
  });
}

// useChat shows saved messages as UI messages, so wrap each plain line in one text part.
export function toUIMessages(conversationId: string, chatHistory: ChatMessage[]): OpenSwapUIMessage[] {
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

// A reply with no body, such as 204 after a delete, reads as null.
async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? String(data.error) : FALLBACK_ERROR_MESSAGE;
    throw new Error(message);
  }

  return data as T;
}
