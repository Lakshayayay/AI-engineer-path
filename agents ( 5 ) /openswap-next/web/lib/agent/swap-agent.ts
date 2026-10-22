import { createOpenAI } from "@ai-sdk/openai";
import { isStepCount, streamText, type ModelMessage } from "ai";
import { getEnv } from "../env";
import { finalAnswerSystemPrompt, systemPrompt, withPreferences } from "./prompts";
import { tools } from "./tools";

// How many steps may call tools. One extra step then forces the final answer.
const MAX_TOOL_TURNS = 5;

interface RunSwapAgentInput {
  contextHistory: ModelMessage[];
  userPrompt: string;
  // What the signed-in user saved on the Settings page. An empty string means none.
  preferences: string;
  // Called once the whole answer is done, with what the server should save.
  onComplete: (result: { contextHistory: ModelMessage[]; answer: string }) => Promise<void>;
}

// Runs the agent loop and streams its answer.
export function streamSwapAgent({ contextHistory, userPrompt, preferences, onComplete }: RunSwapAgentInput) {
  const { OPENAI_API_KEY, AI_MODEL } = getEnv();
  const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

  // Both the normal and the final-answer instructions carry the user's preferences.
  const instructions = withPreferences(systemPrompt, preferences);
  const finalInstructions = withPreferences(finalAnswerSystemPrompt, preferences);

  // Start from everything the model saw before, plus the user's new request.
  const messages: ModelMessage[] = [...contextHistory, { role: "user", content: userPrompt }];

  return streamText({
    model: openai(AI_MODEL),
    instructions,
    messages,
    tools,
    // Each tool round is one step, and the SDK loops until the model answers in text or the steps run out.
    stopWhen: isStepCount(MAX_TOOL_TURNS + 1),
    // On the last step, switch tools off so the model must answer from what it already verified.
    prepareStep: ({ stepNumber }) =>
      stepNumber === MAX_TOOL_TURNS ? { toolChoice: "none", instructions: finalInstructions } : {},
    onEnd: async ({ responseMessages, steps }) => {
      await onComplete({
        // Keep the model's whole output, tool calls and results included, for the next request.
        contextHistory: [...messages, ...responseMessages],
        // The visible answer is every step's text, in the order the user watched it stream.
        answer: steps
          .map((step) => step.text)
          .filter(Boolean)
          .join("\n\n"),
      });
    },
  });
}
