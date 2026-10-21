import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { simulateReadableStream, type ModelMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";

const FINAL_ANSWER = "Here is what I could verify.";

// A model that keeps asking for a tool until tools are switched off, then answers in text.
const toolHungryModel = new MockLanguageModelV4({
  doStream: async (options) => {
    const toolsOff = options.toolChoice?.type === "none";
    const usage = {
      inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 1, text: 1, reasoning: undefined },
    };

    return {
      stream: simulateReadableStream<LanguageModelV4StreamPart>({
        chunks: toolsOff
          ? [
              { type: "text-start", id: "t" },
              { type: "text-delta", id: "t", delta: FINAL_ANSWER },
              { type: "text-end", id: "t" },
              { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
            ]
          : [
              {
                type: "tool-call",
                toolCallId: `call-${options.prompt.length}`,
                toolName: "check_health",
                input: JSON.stringify({ project_name: "Not A Project" }),
              },
              { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
            ],
      }),
    };
  },
});

vi.mock("@ai-sdk/openai", () => ({ createOpenAI: () => () => toolHungryModel }));

describe("streamSwapAgent", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "test-model");
    toolHungryModel.doStreamCalls.length = 0;
  });

  it("stops after the tool turns, forces a final text answer, and hands back the full context", async () => {
    const { streamSwapAgent } = await import("./swap-agent");
    let saved: { contextHistory: ModelMessage[]; answer: string } | undefined;

    const result = streamSwapAgent({
      contextHistory: [],
      userPrompt: "Replace Notion",
      onComplete: async (completed) => {
        saved = completed;
      },
    });
    await result.consumeStream();

    // 5 tool turns, then one more step with tools off.
    expect(toolHungryModel.doStreamCalls).toHaveLength(6);
    expect(toolHungryModel.doStreamCalls.at(-1)?.toolChoice).toEqual({ type: "none" });
    expect(saved?.answer).toBe(FINAL_ANSWER);
    // The saved context starts with the user's request and includes the tool calls and results.
    expect(saved?.contextHistory[0]).toEqual({ role: "user", content: "Replace Notion" });
    expect(saved?.contextHistory.some((message) => message.role === "tool")).toBe(true);
  });
});
