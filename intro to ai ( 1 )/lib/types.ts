/**
 * Shared TypeScript types and interfaces for the Gift Genie application.
 */

// User profile interface representing authenticated users
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

// Conversation / Wish history record (one turn within a session)
export interface HistoryItem {
  id: string;
  sessionId: string;
  prompt: string;
  responseText: string;
  timestamp: number;
}

// One row per conversation, derived by grouping HistoryItem[] by sessionId
export interface HistorySession {
  sessionId: string;
  title: string;
  lastTimestamp: number;
}

// Auth operation response format
export interface AuthResult {
  success: boolean;
  error?: string;
}

