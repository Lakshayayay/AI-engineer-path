import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, isStepCount, APICallError, RetryError } from "ai";
import { googleAI, groqAI, buildSystemInstructions } from "@/lib/ai";
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

  // After retries are exhausted, streamText throws a RetryError whose own
  // message is generic ("Failed after N attempts...") — the 429 only shows
  // up on the wrapped `lastError`, so unwrap it before inspecting.
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  const is429 =
    (APICallError.isInstance(cause) && cause.statusCode === 429) ||
    (cause instanceof Error && /RESOURCE_EXHAUSTED|\b429\b/.test(cause.message));

  if (is429) {
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
    // 1. Parse and validate the incoming request body
    const body = await req.json().catch(() => ({}));
    const validation = GiftRequestSchema.safeParse(body);

    if (!validation.success) {
      const message = validation.error.issues[0]?.message || "Invalid request body";
      return NextResponse.json({ message }, { status: 400 });
    }

    const { messages, prompt, userPrompt, location } = validation.data;

    // 2. Determine AI provider & verify API key
    const isGroq = process.env.AI_PROVIDER === "groq";

    if (isGroq && !process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { message: "AI API key not configured. Set GROQ_API_KEY in .env.local" },
        { status: 503 }
      );
    }

    if (!isGroq && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { message: "AI API key not configured. Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local" },
        { status: 503 }
      );
    }

    // 3. Set up model, system prompt, and search grounding tools
    const model = isGroq
      ? groqAI(process.env.GROQ_MODEL || "openai/gpt-oss-120b")
      : googleAI(process.env.AI_MODEL || "gemini-3.6-flash");

    const tools = isGroq
      ? undefined
      : { google_search: googleAI.tools.googleSearch({}) };

    const system = buildSystemInstructions(location);

    // 4. Prepare stream inputs (multi-turn conversation vs single prompt)
    const hasMessages = Boolean(messages && messages.length > 0);
    const streamInput = hasMessages
      ? { messages: await convertToModelMessages(messages as any) }
      : { prompt: (prompt || userPrompt || "").trim() };

    // 5. Generate and stream the response
    const result = streamText({
      model,
      system,
      tools,
      stopWhen: isStepCount(2),
      ...streamInput,
    });

    return result.toUIMessageStreamResponse({
      sendSources: true, // required for citation chips
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
