import type { ModelMessage } from "ai";

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
