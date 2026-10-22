import "./environment.js";
import express from "express";
import OpenAI from "openai";
import { runAgent } from "./agent/index.js";
import { conversationStore } from "./store/conversations.js";
import { getStarterSwapOptions } from "./store/swaps.js";

// Create the Express app for our backend server
const app = express();
// Parse JSON request bodies before route handlers read req.body
app.use(express.json());

// Initialize an OpenAI client for your provider using env vars
const client = new OpenAI({
  apiKey: process.env.AI_KEY,
  baseURL: process.env.AI_URL,
});

// Send the UI a list of popular software names to show as chips
app.get("/api/popular-software", (_req, res) => {
  res.json({ popularSoftware: getStarterSwapOptions() });
});

// List summaries for the sidebar, without either history array.
app.get("/api/conversations", async (_req, res) => {
  try {
    res.json({ conversations: await conversationStore.listConversations() });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Create the record on first send; opening a fresh chat alone stores nothing.
app.post("/api/conversations", async (_req, res) => {
  try {
    const conversation = await conversationStore.createConversation();
    res.status(201).json({ conversation: getConversationForBrowser(conversation) });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Reopen the visible transcript. Model history stays on the server.
// the chathistory is sent back and the context history stays inside the server
// which is then given back to the - agents to work
app.get("/api/conversations/:conversationId", async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const conversation = await conversationStore.getConversation(conversationId);
    res.json({ conversation: getConversationForBrowser(conversation) });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Continue the selected conversation using its ID and the new text from the browser.
app.post("/api/swaps", async (req, res) => {
  const { conversationId, userPrompt } = req.body;

  // Reject empty input before it can spend a model request
  if (typeof conversationId !== "string" || !conversationId.trim()) {
    res.status(400).json({ error: "A conversation id is required." });
    return;
  }

  if (typeof userPrompt !== "string" || !userPrompt.trim()) {
    res.status(400).json({ error: "A user prompt is required." });
    return;
  }

  console.log("[/api/swaps] prompt:", userPrompt);

  try {
    const conversation = await conversationStore.getConversation(conversationId);

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }

    // Name a conversation once, from its first message.
    let title = conversation.title;
    if (conversation.chatHistory.length === 0) {
      const titleResponse = await client.responses.create({
        model: process.env.AI_MODEL,
        input: `Write a sidebar title for this user prompt: ${userPrompt}`,
        instructions: `You write descriptive and differentiated titles for an app that recommends open source alternatives.

        Only 3 to 6 words in plain text output.

        Never use generic words like open source, alternative, recommendation, etc. in your titles.

        Instead, prioritize using mentioned products, software category tags, and additional requirements from the user's prompt.`,
      });
      title = titleResponse.output_text;
    }

    // Run the agent loop until it has a final answer for this prompt.
    const loadedContextHistory = conversation.contextHistory
    const { swapAgentResponse, contextHistory } = await runAgent({ 
      client, 
      contextHistory: loadedContextHistory, 
      userPrompt 
    });

    // Save the new exchange so the page still has it after a reload.
    const savedConversation = await conversationStore.saveConversation({
      ...conversation,
      title,
      chatHistory: [
        ...conversation.chatHistory,
        {
          role: "user",
          content: userPrompt,
        },
        {
          role: "assistant",
          content: swapAgentResponse,
        },
      ],
      contextHistory
    });

    res.json({ conversation: getConversationForBrowser(savedConversation) });
  } catch (error) {
    handleServerError(res, error);
  }
});

// Select the chat history and metadata, leaving the agent context on the server.
function getConversationForBrowser(conversation) {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    chatHistory: conversation.chatHistory,
  };
}

// Give the browser one stable error shape for any failure.
function handleServerError(res, error) {
  console.error(error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

// Start the Express server so the frontend can talk to it
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`OpenSwap server running at http://localhost:${PORT}`);
});
