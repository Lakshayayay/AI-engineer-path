import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserConversation, Conversation, ConversationSummary } from "../types";

const NEW_CONVERSATION_TITLE = "New conversation";

// Every saved conversation lives in this one JSON file. The server owns it, so the browser never reads it.
const CONVERSATIONS_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "conversations.json");

// The sidebar only needs labels and IDs, ordered by the latest activity.
export async function listConversations(): Promise<ConversationSummary[]> {
  const conversations = await readConversations();

  return conversations
    .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// Continuing a conversation needs its chat history and complete agent context.
export async function getConversation(id: string): Promise<Conversation | null> {
  const conversations = await readConversations();
  return conversations.find((conversation) => conversation.id === id) ?? null;
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

// Add the record, or replace the stored one, and note when it changed.
export async function saveConversation(conversation: Conversation): Promise<Conversation> {
  const conversations = await readConversations();
  const savedConversation = { ...conversation, updatedAt: new Date().toISOString() };
  const index = conversations.findIndex((item) => item.id === conversation.id);

  if (index === -1) {
    conversations.push(savedConversation);
  } else {
    conversations[index] = savedConversation;
  }

  await writeConversations(conversations);
  return savedConversation;
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

// A missing file just means no chat has been saved yet.
async function readConversations(): Promise<Conversation[]> {
  try {
    const database = JSON.parse(await readFile(CONVERSATIONS_FILE, "utf8")) as { conversations: Conversation[] };
    return database.conversations;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

// Indent the JSON so you can open the file and read what was saved.
async function writeConversations(conversations: Conversation[]): Promise<void> {
  await writeFile(CONVERSATIONS_FILE, `${JSON.stringify({ conversations }, null, 2)}\n`);
}
