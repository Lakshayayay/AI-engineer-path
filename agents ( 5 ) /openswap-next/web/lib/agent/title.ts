import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getEnv } from "../env";
import { titleSystemPrompt } from "./prompts";

const FALLBACK_TITLE_LENGTH = 60;

// Names a conversation once, from its first message. A failed title never blocks the answer.
export async function generateTitle(userPrompt: string): Promise<string> {
  const { OPENAI_API_KEY, AI_MODEL } = getEnv();
  const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const { text } = await generateText({
      model: openai(AI_MODEL),
      instructions: titleSystemPrompt,
      prompt: `Write a sidebar title for this user prompt: ${userPrompt}`,
    });

    return text.trim() || fallbackTitle(userPrompt);
  } catch (error: unknown) {
    console.warn("Title generation failed, using the prompt instead:", error);
    return fallbackTitle(userPrompt);
  }
}

// Label the chat with the start of its first message.
function fallbackTitle(userPrompt: string): string {
  return userPrompt.trim().slice(0, FALLBACK_TITLE_LENGTH);
}
