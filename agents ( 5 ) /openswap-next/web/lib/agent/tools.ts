import { openai } from "@ai-sdk/openai";
import { tool } from "ai";
import { z } from "zod";
import { sendToDiscord } from "../store/discord";
import { checkHealth } from "../store/github";
import { searchSwaps } from "../store/swaps";
import { failure, type ToolResult } from "../tool-result";

// The model picks a tool by name, so this one map is the lookup. The SDK validates the arguments against each schema.
export const tools = {
  search_swaps: tool({
    description:
      "Search OpenSwap's database for open-source alternatives to a specified product or a one word software category tag. Returns every match, for example 'Notion' returns AppFlowy, AFFiNE and others.",
    inputSchema: z.strictObject({
      query: z
        .string()
        .describe(
          "Only the name of the product being replaced or a one word software category tag. Do not include any requirements or other words.",
        ),
    }),
    strict: true,
    execute: ({ query }) => runTool(() => searchSwaps({ query })),
  }),

  check_health: tool({
    description:
      "Check the maintenance health of a project. Use this to verify if a suggested alternative is actively maintained.",
    inputSchema: z.strictObject({
      project_name: z.string().describe("A project name. Examples: 'Mumble' or 'Strapi'."),
      // Strict mode needs every field present, so "no repo" is null rather than a missing field.
      github_repo: z
        .string()
        .nullable()
        .describe(
          "Only for a project found on the web: its GitHub repo as owner/name, for example 'acme/widgetly'. Use null for projects from the OpenSwap database.",
        ),
    }),
    strict: true,
    execute: ({ project_name, github_repo }) =>
      runTool(() => checkHealth({ projectName: project_name, githubRepo: github_repo })),
  }),

  // OpenAI runs this search itself, so there is no execute function and no ToolResult here. It is the one
  // tool that breaks our result shape. "low" context size keeps the search cheap and fast.
  web_search: openai.tools.webSearch({ searchContextSize: "low" }),

  send_to_discord: tool({
    description:
      "Post a message to the team's Discord channel. Use it only when the user clearly asks to send or share something to Discord. The message is posted as plain text.",
    inputSchema: z.strictObject({
      message: z
        .string()
        .describe(
          "A short, self-contained message of at most 2000 characters, for example a summary of the recommended alternatives with their links.",
        ),
    }),
    strict: true,
    execute: ({ message }) => runTool(() => sendToDiscord({ message })),
  }),
};

// A failed tool returns an error result the model can read, so one bad call never crashes the run.
async function runTool<T>(handler: () => Promise<ToolResult<T>>): Promise<ToolResult<T>> {
  try {
    return await handler();
  } catch (error: unknown) {
    console.error("Tool failed:", error);
    return failure(error instanceof Error ? error.message : "The tool failed.");
  }
}
