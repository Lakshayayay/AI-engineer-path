/**
 * Shared TypeScript types and interfaces for the Gift Genie application.
 */

// User profile interface representing authenticated or local mock users
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  isMock: boolean;
}

// Conversation / Wish history record
export interface HistoryItem {
  id: string;
  prompt: string;
  responseText: string;
  timestamp: number;
}

// Auth operation response format
export interface AuthResult {
  success: boolean;
  user?: AppUser | null;
  error?: string;
}

// Stream chunk event data format from /api/gift SSE
export interface StreamChunkPayload {
  chunk?: string;
  error?: string;
}
