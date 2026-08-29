import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());

// Initialize OpenAI client if credentials exist
let openai = null;
if (process.env.AI_KEY && process.env.AI_KEY !== "your_openai_api_key") {
  openai = new OpenAI({
    apiKey: process.env.AI_KEY,
    baseURL: process.env.AI_URL,
  });
}

// System prompt with few-shot example and UI formatting instructions
const SYSTEM_INSTRUCTIONS = `You are the Gift Genie, an expert gift-matching assistant.
You generate gift ideas that feel thoughtful, specific, and genuinely useful.
Your output must be in structured Markdown. Do not write any introductions, greetings, or conclusions. Start directly with the gift suggestions.

Format constraints:
- Use H3 headers (###) for each gift idea.
- List 3 distinct, specific recommendations.
- Under each gift, include:
  * **Why it works**: 2-3 sentences explaining the thought behind it.
  * **How to get it**: Detailed advice on where to purchase it, adapting to any location or situation constraints mentioned.
- Conclude with a section titled "### Questions for you" containing 2-3 clarifying questions to narrow down future suggestions.

Few-Shot Example:
User Input: "Friend who loves hiking, birthday in 2 weeks, budget $50, lives in Seattle."
Output:
### 1. Premium Rainproof Backpack Cover & Waterproof Trail Maps
* **Why it works**: Seattle is notorious for sudden rain showers, and keeping gear dry is a top priority for hikers. Combining a durable cover with local waterproof topographical maps shows great attention to detail.
* **How to get it**: You can purchase a high-quality Osprey rain cover at the REI Flagship Store in downtown Seattle (222 Yale Ave N) or order it online with expedited shipping to arrive within 3 days.

### 2. Double-Walled Insulated Flask (32oz)
* **Why it works**: Perfect for keeping coffee hot during cold morning hikes in the Cascades or water ice-cold on summer trails. A durable, powder-coated flask will last for years.
* **How to get it**: Hydro Flask or Yeti options are available at local Seattle outdoor shops like Ascent Outdoors in Ballard, or via Amazon Prime.

### 3. Merino Wool Trail Socks (3-Pack)
* **Why it works**: Ask any hiker: high-quality wool socks are the single best gear upgrade. They prevent blisters and regulate temperature perfectly in the damp Pacific Northwest climate.
* **How to get it**: Darn Tough or Smartwool socks are sold at local outfitters or online outlets.

### Questions for you
1. Does your friend prefer day hikes or overnight backpacking trips?
2. Are they in need of any specific gear upgrades, or do they prefer comfort/luxury items?`;

// Mock streaming helper for fallback
async function streamMockResponse(userPrompt, res) {
  const words = `🧞 Greetings! I am the Gift Genie. Because the AI environment variables (AI_KEY or AI_URL) are not configured or invalid in your \`.env\` file, I am running in **Offline Mock Mode** to demonstrate the backend streaming functionality.

Here are 3 simulated gift ideas based on your prompt: **"${userPrompt}"**

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
2. Do you prefer a physical keepsake or an experiential gift?`.split(" ");

  // Stream word by word with a slight delay
  for (let i = 0; i < words.length; i++) {
    const chunk = words[i] + " ";
    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  res.write("data: [DONE]\n\n");
  res.end();
}

app.post("/api/gift", async (req, res) => {
  const { userPrompt } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ message: "Prompt is required" });
  }

  // Setup SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Fallback if OpenAI is not initialized
  if (!openai) {
    console.warn("AI_KEY not configured. Falling back to mock streaming response.");
    return streamMockResponse(userPrompt, res);
  }

  try {
    // Call the OpenAI Responses API with the web search tool and streaming enabled
    const responseStream = await openai.responses.create({
      model: process.env.AI_MODEL || "gpt-4o",
      instructions: SYSTEM_INSTRUCTIONS,
      input: userPrompt,
      tools: [{ type: "web_search" }],
      stream: true,
    });

    for await (const event of responseStream) {
      if (event.type === "response.output_text.delta") {
        res.write(`data: ${JSON.stringify({ chunk: event.delta })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("AI Generation Error:", error);
    // If the API call fails, fallback to the mock stream so the client gets a graceful response
    res.write(`data: ${JSON.stringify({ chunk: "\n\n⚠️ *An error occurred while connecting to the AI model. Falling back to simulated response...*\n\n" })}\n\n`);
    return streamMockResponse(userPrompt, res);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
