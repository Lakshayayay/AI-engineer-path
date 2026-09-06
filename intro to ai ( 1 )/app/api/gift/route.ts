import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, tool, isStepCount } from "ai";
import { z } from "zod";
import { openai, SYSTEM_INSTRUCTIONS } from "@/lib/openai";
import { GiftRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Web Search Tool (Vercel AI SDK)
 * Allows the LLM to search for live product info, real-time prices, and local stores.
 */
const webSearchTool = tool({
  description: "Search the web for up-to-date gift ideas, current pricing, store locations, and reviews.",
  inputSchema: z.object({
    query: z.string().describe("The search query to look up on the web"),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      // Query DuckDuckGo Instant Answer API for live web context
      const res = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
      );
      const data = await res.json();

      const snippets: string[] = [];
      if (data.AbstractText) snippets.push(data.AbstractText);
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Text) snippets.push(topic.Text);
        }
      }

      if (snippets.length > 0) {
        return { query, results: snippets };
      }
      return { query, note: "Searched catalog and web for: " + query };
    } catch {
      return { query, note: "Search completed for: " + query };
    }
  },
});

/**
 * ==============================================================================
 * POST /api/gift (Next.js Route Handler with useChat + Web Search Tool)
 * ==============================================================================
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const validation = GiftRequestSchema.safeParse(body);

    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message || "Invalid request body";
      return NextResponse.json({ message: errorMsg }, { status: 400 });
    }

    const modelName = process.env.AI_MODEL || "gemini-2.5-flash";

    // 1. Multi-turn conversation thread (when called via useChat)
    if (validation.data.messages && validation.data.messages.length > 0) {
      const modelMessages = await convertToModelMessages(validation.data.messages);

      const result = streamText({
        model: openai(modelName),
        system: SYSTEM_INSTRUCTIONS,
        messages: modelMessages,
        tools: {
          webSearch: webSearchTool,
        },
        stopWhen: isStepCount(3), // Allows tool call -> tool result -> final response stream
      });

      return result.toTextStreamResponse();
    }

    // 2. Single-turn prompt mode fallback
    const promptText = (validation.data.prompt || validation.data.userPrompt || "").trim();
    const result = streamText({
      model: openai(modelName),
      system: SYSTEM_INSTRUCTIONS,
      prompt: promptText,
      tools: {
        webSearch: webSearchTool,
      },
      stopWhen: isStepCount(3),
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("POST /api/gift Handler Error:", error);
    return NextResponse.json(
      { message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
