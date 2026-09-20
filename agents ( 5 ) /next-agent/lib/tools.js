import { tool } from "ai";
import { z } from "zod";

/**
 * Standardized Tool Execution Wrapper
 * Wraps our tool execution logic to ensure uniform error handling
 * and prevent agent crashes on tool failure.
 */
async function executeTool(name, asyncFn) {
  try {
    return await asyncFn();
  } catch (error) {
    console.error(`[Tool Error] ${name}:`, error.message);
    return JSON.stringify({ 
      error: true, 
      message: `Failed to execute ${name}. ${error.message}` 
    });
  }
}

export const getCurrentWeather = tool({
  description: "Get the current weather for a given city or location.",
  parameters: z.object({
    location: z
      .string()
      .describe("The name of the city from where to get the weather, e.g. Tokyo, San Francisco, London"),
  }),
  execute: async ({ location }) => {
    return executeTool('getCurrentWeather', async () => {
      const weatherUrl = new URL("https://apis.scrimba.com/openweathermap/data/2.5/weather");
      weatherUrl.searchParams.append("q", location);
      weatherUrl.searchParams.append("units", "imperial");
      
      const res = await fetch(weatherUrl.toString());
      if (!res.ok) {
        throw new Error(`Weather API returned status ${res.status}`);
      }
      const data = await res.json();
      return JSON.stringify(data);
    });
  },
});

export const getLocation = tool({
  description: "Get the user's current city, region, and country based on their IP address.",
  parameters: z.object({}),
  execute: async () => {
    return executeTool('getLocation', async () => {
      const res = await fetch("https://ipapi.co/json/");
      if (!res.ok) {
        throw new Error(`Location API returned status ${res.status}`);
      }
      const data = await res.json();
      return JSON.stringify(data);
    });
  },
});

export const calculateMath = tool({
  description: "Evaluate a mathematical expression.",
  parameters: z.object({
    expression: z.string().describe("A math expression to evaluate, e.g. '2 + 2', '5 * 10'")
  }),
  execute: async ({ expression }) => {
    return executeTool('calculateMath', async () => {
      // Very basic and naive math evaluator for demo purposes
      // DO NOT use eval in production without strict sandboxing!
      // Using a regex to allow only numbers and basic operators
      if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
        throw new Error("Invalid characters in expression");
      }
      
      // eslint-disable-next-line no-eval
      const result = eval(expression);
      return JSON.stringify({ result });
    });
  }
});

export const searchWikipedia = tool({
  description: "Search Wikipedia for factual information, history, people, or concepts. Use this to find current or factual knowledge from the web.",
  parameters: z.object({
    query: z.string().describe("The search query for Wikipedia")
  }),
  execute: async ({ query }) => {
    return executeTool('searchWikipedia', async () => {
      const url = new URL("https://en.wikipedia.org/w/api.php");
      url.searchParams.append("action", "query");
      url.searchParams.append("list", "search");
      url.searchParams.append("srsearch", query);
      url.searchParams.append("utf8", "");
      url.searchParams.append("format", "json");
      url.searchParams.append("origin", "*");
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Wikipedia API failed");
      const data = await res.json();
      
      const results = data.query.search.slice(0, 3).map(item => ({
        title: item.title,
        snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, "") // remove HTML
      }));
      
      return JSON.stringify(results);
    });
  }
});

export const tools = {
  getCurrentWeather,
  getLocation,
  calculateMath,
  searchWikipedia
};
