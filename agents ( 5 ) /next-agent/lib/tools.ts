import { tool } from "ai";
import { z } from "zod";
import { evaluate } from "./math";

/**
 * Tools the model can call. Each tool has three parts:
 *   description : tells the model WHEN to use it
 *   parameters  : a Zod schema, so the model's arguments are validated before our code runs
 *   execute     : the code that actually runs on our server
 */

type ToolError = { error: true; message: string };

/**
 * Runs a tool's work and turns any failure into data the model can read.
 * Without this, one failed fetch would crash the whole agent loop.
 */
async function runTool<T>(name: string, work: () => Promise<T>): Promise<T | ToolError> {
  try {
    return await work();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[Tool Error] ${name}:`, reason);
    return { error: true, message: `Failed to execute ${name}. ${reason}` };
  }
}

async function fetchJson<T>(url: string | URL, label: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} returned status ${response.status}`);
  return response.json() as Promise<T>;
}

export const getCurrentWeather = tool({
  description: "Get the current weather for a given city or location.",
  parameters: z.object({
    location: z.string().describe("The city to get the weather for, e.g. Tokyo, San Francisco, London"),
  }),
  execute: ({ location }) =>
    runTool("getCurrentWeather", () => {
      const url = new URL("https://apis.scrimba.com/openweathermap/data/2.5/weather");
      url.searchParams.set("q", location);
      url.searchParams.set("units", "imperial");
      return fetchJson(url, "Weather API");
    }),
});

export const getLocation = tool({
  description: "Get the user's current city, region, and country based on their IP address.",
  parameters: z.object({}),
  execute: () => runTool("getLocation", () => fetchJson("https://ipapi.co/json/", "Location API")),
});

export const calculateMath = tool({
  description: "Evaluate a mathematical expression using + - * / and parentheses.",
  parameters: z.object({
    expression: z.string().describe("A math expression, e.g. '2 + 2' or '(5 + 3) * 10'"),
  }),
  execute: ({ expression }) => runTool("calculateMath", async () => ({ result: evaluate(expression) })),
});

type WikipediaSearchResponse = { query: { search: { title: string; snippet: string }[] } };

export const searchWikipedia = tool({
  description: "Search Wikipedia for factual information, history, people, or concepts.",
  parameters: z.object({
    query: z.string().describe("The search query for Wikipedia"),
  }),
  execute: ({ query }) =>
    runTool("searchWikipedia", async () => {
      const params = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: query,
        format: "json",
        origin: "*",
      });
      const data = await fetchJson<WikipediaSearchResponse>(
        `https://en.wikipedia.org/w/api.php?${params}`,
        "Wikipedia API"
      );

      return data.query.search.slice(0, 3).map(({ title, snippet }) => ({
        title,
        snippet: snippet.replace(/<[^>]+>/g, ""), // the API returns snippets with HTML tags
      }));
    }),
});

export const tools = {
  getCurrentWeather,
  getLocation,
  calculateMath,
  searchWikipedia,
};
