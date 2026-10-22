import type { InferUITools, ModelMessage, UIDataTypes, UIMessage } from "ai";
import type { tools } from "./agent/tools";

// The most characters a user may save as preferences. The database enforces the same limit (supabase/schema.sql).
export const MAX_PREFERENCES_LENGTH = 1000;

// The chat message the browser renders. Typing the tools lets the UI read each tool's input and output.
// Type-only imports: no server code reaches the browser.
export type OpenSwapUIMessage = UIMessage<unknown, UIDataTypes, InferUITools<typeof tools>>;

// The signed-in user's details the browser may see. For display only, never for permissions.
export interface AccountSummary {
  name: string | null;
  email: string | null;
}

// One line of the transcript the user sees.
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// A saved chat. contextHistory is the full model context and never leaves the server.
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  chatHistory: ChatMessage[];
  contextHistory: ModelMessage[];
}

// Sidebar label for a saved chat.
export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

// The only conversation fields the browser may see.
export interface BrowserConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  chatHistory: ChatMessage[];
}
