import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { tools } from "@/lib/tools";

// Groq exposes an OpenAI-compatible API, so the existing provider works with a custom baseURL
const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

// Set max duration for edge/serverless functions
export const maxDuration = 30;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing GROQ_API_KEY. Please set your key in `next-agent/.env.local` to enable the agent." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `
      You are a highly capable AI assistant embedded in a modern web application.
      You have access to a variety of tools. Always use these tools to fetch real-world data 
      rather than relying on your training data when asked about current events, locations, or facts.
      
      Guidelines:
      - Be concise but helpful.
      - If you use a tool, briefly acknowledge the result.
      - Format your responses using Markdown for readability (e.g., bullet points, bold text).
      - Do not make up information if a tool fails. Tell the user the tool failed.
    `;

    const result = streamText({
      model: groq.chat(process.env.GROQ_MODEL || "openai/gpt-oss-120b"),
      system: systemPrompt,
      messages,
      tools,
      maxSteps: 5, // Autonomous multi-step tool calling loop
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Agent execution error:", error);
    
    // Check for rate limit errors specifically if possible
    if (error.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({ error: error.message || "An unexpected agent error occurred" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
