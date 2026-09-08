import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, isStepCount } from "ai";
import { googleAI, buildSystemInstructions } from "@/lib/ai";
import { GiftRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Turns a Gemini/AI-SDK stream failure into a message the chat UI can show.
 * The Vercel AI SDK starts the HTTP response before the model has replied,
 * so this is the only place a mid-stream error reaches the browser.
 */
function streamErrorMessage(error: unknown): string {
  console.error("Gemini stream failed:", error);
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
    return "Daily free limit reached for this model. Try again later, or set AI_MODEL to a lighter model in .env.local.";
  }
  return "The genie hit a snag. Please try again.";
}

/**
 * ==============================================================================
 * POST /api/gift (Next.js Route Handler with useChat + Gemini Search Grounding)
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

    // Guard: Ensure API key is configured
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { message: "AI API key not configured. Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local" },
        { status: 503 }
      );
    }

    const modelName = process.env.AI_MODEL || "gemini-3.6-flash";
    const system = buildSystemInstructions(validation.data.location);

    // Google's grounding search runs inside Google's own call — it isn't a
    // separate client-side tool round trip like the old DuckDuckGo tool was.
    const tools = { google_search: googleAI.tools.googleSearch({}) };

    // 1. Multi-turn conversation thread (when called via useChat)
    if (validation.data.messages && validation.data.messages.length > 0) {
      const modelMessages = await convertToModelMessages(validation.data.messages as any);

      const result = streamText({
        model: googleAI(modelName),
        system,
        messages: modelMessages,
        tools,
        stopWhen: isStepCount(2),
      });

      return result.toUIMessageStreamResponse({
        sendSources: true, // required for citation chips — defaults to false
        onError: streamErrorMessage,
      });
    }

    // 2. Single-turn prompt mode fallback
    const promptText = (validation.data.prompt || validation.data.userPrompt || "").trim();
    const result = streamText({
      model: googleAI(modelName),
      system,
      prompt: promptText,
      tools,
      stopWhen: isStepCount(2),
    });

    return result.toUIMessageStreamResponse({
      sendSources: true,
      onError: streamErrorMessage,
    });
  } catch (error: any) {
    console.error("POST /api/gift Handler Error:", error);
    return NextResponse.json(
      { message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
