import { streamText, APICallError, RetryError } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { tools } from "@/lib/tools";

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const MAX_AGENT_STEPS = 5; // how many model -> tool -> model rounds one question may use

const SYSTEM_PROMPT = `
You are a highly capable AI assistant embedded in a modern web application.
You have access to a variety of tools. Always use these tools to fetch real-world data
rather than relying on your training data when asked about current events, locations, or facts.

Guidelines:
- Be concise but helpful.
- If you use a tool, briefly acknowledge the result.
- Format your responses using Markdown for readability (e.g., bullet points, bold text).
- Do not make up information if a tool fails. Tell the user the tool failed.
`;

// Groq exposes an OpenAI-compatible API, so the existing provider works with a custom baseURL
const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

// Next.js setting: lets a hosted function (e.g. on Vercel) run up to 30s, so multi-step tool loops aren't cut off
export const maxDuration = 30;

/** The SDK puts the HTTP status on `statusCode`; after retries it wraps the real error in a RetryError. */
function statusOf(error: unknown): number | undefined {
  const inner = RetryError.isInstance(error) ? error.lastError : error;
  return APICallError.isInstance(inner) ? inner.statusCode : undefined;
}

/** Turns any error into a message that is safe and useful to show in the chat UI. */
function friendlyMessage(error: unknown): string {
  const status = statusOf(error);
  if (status === 401) return "Groq rejected the API key. Check GROQ_API_KEY in next-agent/.env.local and restart the server.";
  if (status === 429) return "Rate limit exceeded. Please try again later.";
  return error instanceof Error ? error.message : "An unexpected agent error occurred.";
}

// Errors are returned as plain text because useChat shows the response body as `error.message`.
export async function POST(req: Request) { // basically taking the agent request and then taking it further
  if (!process.env.GROQ_API_KEY) {
    return new Response("Missing GROQ_API_KEY. Add it to next-agent/.env.local to enable the agent.", { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.messages)) {
    return new Response("Request body must be JSON with a `messages` array.", { status: 400 });
  }

  try {
    const result = streamText({ // main ai api
      model: groq.chat(process.env.GROQ_MODEL || DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      messages: body.messages,
      tools,
      maxSteps: MAX_AGENT_STEPS,
    });

    // Errors thrown *after* streaming starts never reach the catch below,
    // so getErrorMessage is what puts the real reason on screen.
    return result.toDataStreamResponse({ getErrorMessage: friendlyMessage });
  } catch (error) {
    console.error("Agent execution error:", error);
    return new Response(friendlyMessage(error), { status: statusOf(error) ?? 500 });
  }
}
