import type { ModelMessage } from "ai";
import type { Database, Json } from "../supabase/database.types";
import type { Db } from "../supabase/server";
import type { BrowserConversation, ChatMessage, Conversation, ConversationSummary } from "../types";

const NEW_CONVERSATION_TITLE = "New conversation";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"];

// Every function takes the request's `db` client. Row Level Security makes it see only the signed-in user's chats.

// The sidebar only needs labels and IDs, ordered by the latest activity.
export async function listConversations(db: Db): Promise<ConversationSummary[]> {
  const { data, error } = await db
    .from("conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return data.map(({ id, title, updated_at }) => ({ id, title, updatedAt: updated_at }));
}

// Continuing a conversation needs its chat history and complete agent context.
export async function getConversation(db: Db, id: string): Promise<Conversation | null> {
  const { data, error } = await db.from("conversations").select("*").eq("id", id).maybeSingle();

  if (error) throw error;

  return data ? toConversation(data) : null;
}

// Build an empty record for a fresh chat. Nothing is stored until the first save.
export function startConversation(id: string): Conversation {
  const now = new Date().toISOString();

  return {
    id,
    title: NEW_CONVERSATION_TITLE,
    createdAt: now,
    updatedAt: now,
    chatHistory: [],
    contextHistory: [],
  };
}

// Add the row, or replace the stored one, and note when it changed.
export async function saveConversation(db: Db, conversation: Conversation): Promise<void> {
  const { error } = await db.from("conversations").upsert(toRow(conversation, new Date().toISOString()));

  if (error) throw error;
}

// Remove one chat. Returns false when no row was deleted: it does not exist, or it belongs to someone else.
export async function deleteConversation(db: Db, id: string): Promise<boolean> {
  const { data, error } = await db.from("conversations").delete().eq("id", id).select("id");

  if (error) throw error;

  return data.length > 0;
}

// Select the chat history and metadata, leaving the agent context on the server.
export function toBrowserConversation(conversation: Conversation): BrowserConversation {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    chatHistory: conversation.chatHistory,
  };
}

// Database columns are snake_case; the app's record is camelCase.
export function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Only this app writes these columns, so the stored JSON already has these shapes.
    chatHistory: row.chat_history as unknown as ChatMessage[],
    contextHistory: row.context_history as unknown as ModelMessage[],
  };
}

// user_id is left out on purpose: the database fills it from the login token, so a request can't pick the owner.
export function toRow(conversation: Conversation, updatedAt: string): ConversationInsert {
  return {
    id: conversation.id,
    title: conversation.title,
    created_at: conversation.createdAt,
    updated_at: updatedAt,
    chat_history: conversation.chatHistory as unknown as Json,
    context_history: conversation.contextHistory as unknown as Json,
  };
}
