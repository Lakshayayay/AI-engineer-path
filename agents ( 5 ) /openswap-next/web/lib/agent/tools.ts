import { tool } from "ai";
import { z } from "zod";
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
    }),
    strict: true,
    execute: ({ project_name }) => runTool(() => checkHealth({ projectName: project_name })),
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
