import { describe, expect, it } from "vitest";
import { startConversation, toBrowserConversation, toConversation, toRow } from "./conversations";

const ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "99999999-9999-4999-8999-999999999999",
  title: "Notion swaps",
  chat_history: [
    { role: "user", content: "Replace Notion" },
    { role: "assistant", content: "Try AppFlowy." },
  ],
  context_history: [{ role: "user", content: "Replace Notion" }],
  created_at: "2026-10-22T10:00:00+00:00",
  updated_at: "2026-10-22T11:00:00+00:00",
};

describe("conversations store mapping", () => {
  it("turns a database row into the app's conversation record", () => {
    expect(toConversation(ROW)).toEqual({
      id: ROW.id,
      title: "Notion swaps",
      createdAt: ROW.created_at,
      updatedAt: ROW.updated_at,
      chatHistory: ROW.chat_history,
      contextHistory: ROW.context_history,
    });
  });

  it("turns a conversation into a row without choosing the owner", () => {
    const conversation = { ...startConversation(ROW.id), title: "Notion swaps" };

    const row = toRow(conversation, "2026-10-22T12:00:00.000Z");

    expect(row).toMatchObject({ id: ROW.id, title: "Notion swaps", updated_at: "2026-10-22T12:00:00.000Z" });
    // The database fills user_id from the login token, so a request can never save a chat as someone else.
    expect(row).not.toHaveProperty("user_id");
  });

  it("never sends the model context to the browser", () => {
    const conversation = {
      ...startConversation("33333333-3333-4333-8333-333333333333"),
      contextHistory: [{ role: "user" as const, content: "secret context" }],
    };

    expect(toBrowserConversation(conversation)).not.toHaveProperty("contextHistory");
  });
});
