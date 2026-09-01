import { NextRequest, NextResponse } from "next/server";
import { GiftRequestSchema } from "@/lib/schema";
import { openai, SYSTEM_INSTRUCTIONS } from "@/lib/openai";

// Force Node.js runtime for streaming response compatibility
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ==============================================================================
 * FALLBACK MOCK STREAMER (Offline / Zero-Config Mode)
 * ==============================================================================
 * When AI_KEY is missing or invalid in .env, this function simulates real-time
 * token-by-token streaming so you can test the frontend UI without an API key.
 */
function createMockStream(userPrompt: string): ReadableStream {
  const encoder = new TextEncoder();

  // Simulated AI recommendation text
  const mockText = `🧞 Greetings! I am the Gift Genie. Because the AI environment variables (AI_KEY or AI_URL) are not configured in your \`.env\` file, I am running in **Offline Mock Mode** to demonstrate the Next.js streaming functionality.

Here are 3 curated gift ideas based on your wish: **"${userPrompt}"**

### 1. Curated Artisanal Gift Basket
* **Why it works**: A selection of high-quality local treats, cheeses, and custom chocolates is universally appreciated and shows care without being overly personal.
* **How to get it**: You can customize one at a local gourmet food shop, or order from online stores like Harry & David for direct delivery.

### 2. Personalized Premium Leather Journal
* **Why it works**: Perfect for sketching, note-taking, or journaling. Real leather smells premium and gets better with age.
* **How to get it**: You can find custom engravers on Etsy, or visit a local stationery boutique for custom embossing.

### 3. Multi-use Bluetooth Smart Tracker
* **Why it works**: An incredibly practical gift for anyone who frequently misplaces their keys, wallet, or phone. Sleek, useful, and high-tech.
* **How to get it**: Buy a Tile or Apple AirTag pack from any electronics retail store or major online retailer.

### Questions for you
1. What is the approximate age and main interests of the recipient?
2. Do you prefer a physical keepsake or an experiential gift?`;

  const words = mockText.split(" ");

  return new ReadableStream({
    async start(controller) {
      // Loop over words and push them with a tiny delay (simulates AI generation speed)
      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + " ";
        // Standard SSE format: "data: {"chunk": "word "}\n\n"
        const payload = `data: ${JSON.stringify({ chunk })}\n\n`;
        controller.enqueue(encoder.encode(payload));

        // 25ms delay between words
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      // Signal the frontend that the stream is finished
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

/**
 * ==============================================================================
 * POST /api/gift (Next.js Route Handler)
 * ==============================================================================
 * 1. Receives { userPrompt } from the frontend.
 * 2. Validates it with Zod (stops invalid/empty input).
 * 3. Calls OpenAI with streaming enabled.
 * 4. Pushes tokens chunk-by-chunk to the client using Server-Sent Events (SSE).
 */
export async function POST(req: NextRequest) {
  try {
    // ------------------------------------------------------------------------
    // STEP 1: Parse and validate request body with Zod
    // ------------------------------------------------------------------------
    const body = await req.json().catch(() => ({}));
    const validation = GiftRequestSchema.safeParse(body);

    // If validation fails (e.g., prompt too short or empty), return 400 Bad Request
    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message || "Invalid request body";
      return NextResponse.json({ message: errorMsg }, { status: 400 });
    }

    const { userPrompt } = validation.data;
    const client = openai;

    // ------------------------------------------------------------------------
    // STEP 2: Fallback to Mock Stream if OpenAI client is not initialized
    // ------------------------------------------------------------------------
    if (!client) {
      console.warn("AI_KEY not configured. Streaming simulated mock response.");
      return new Response(createMockStream(userPrompt), {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // ------------------------------------------------------------------------
    // STEP 3: Live OpenAI Chat Completion with Streaming (SSE)
    // ------------------------------------------------------------------------
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const modelName = process.env.AI_MODEL || "gpt-4o-mini";

          // Request streamed completion from OpenAI SDK
          const responseStream = await client.chat.completions.create({
            model: modelName,
            messages: [
              { role: "system", content: SYSTEM_INSTRUCTIONS },
              { role: "user", content: userPrompt },
            ],
            stream: true, // 👈 Asks OpenAI to send tokens progressively
          });

          // Read each token delta as it arrives from OpenAI
          for await (const chunk of responseStream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              // Format according to Server-Sent Events (SSE) standard
              const payload = `data: ${JSON.stringify({ chunk: content })}\n\n`;
              controller.enqueue(encoder.encode(payload));
            }
          }

          // Send termination event so the frontend knows streaming is complete
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError: any) {
          console.error("OpenAI Streaming Error:", streamError);

          // Graceful degradation: inform user and stream fallback ideas
          const errorMsg = `\n\n⚠️ *Connection to AI failed (${streamError?.message || "Unknown error"}). Streaming simulated response...*\n\n`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: errorMsg })}\n\n`));

          const fallbackWords = `Here are fallback gift ideas for: "${userPrompt}"\n\n### 1. Curated Gift Box\n* **Why it works**: Universally loved and practical.\n* **How to get it**: Order via your favorite local shop.`.split(" ");
          for (const w of fallbackWords) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: w + " " })}\n\n`));
            await new Promise((r) => setTimeout(r, 20));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    // ------------------------------------------------------------------------
    // STEP 4: Return Stream Response with SSE Headers
    // ------------------------------------------------------------------------
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8", // Tells browser: Expect live stream
        "Cache-Control": "no-cache, no-transform",         // Disables proxy buffering
        Connection: "keep-alive",                          // Keeps connection open
      },
    });
  } catch (error: any) {
    console.error("POST /api/gift Handler Error:", error);
    return NextResponse.json(
      { message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
