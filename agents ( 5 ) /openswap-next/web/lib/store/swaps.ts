import { z } from "zod";
import swapsData from "../../data/swaps.json";
import { failure, noResults, okResult, type ToolResult } from "../tool-result";

// Keep only the fields the agent and the health check read. Zod drops the rest.
const swapSchema = z.object({
  id: z.string(),
  name: z.string(),
  replaces: z.array(z.string()),
  category: z.string(),
  license: z.string(),
  self_hostable: z.boolean(),
  licensing_model: z.string(),
  recommended_for: z.array(z.string()),
  not_recommended_for: z.array(z.string()),
  stars: z.number(),
  language: z.string(),
  tags: z.array(z.string()),
  description: z.string(),
  website: z.string(),
  repo_url: z.string(),
});

// What the model sees for each match: no tags, so context stays small.
const swapSummarySchema = swapSchema.omit({ tags: true });

export type Swap = z.infer<typeof swapSchema>;
export type SwapSummary = z.infer<typeof swapSummarySchema>;

// The catalog is checked once when this module loads.
const swaps = z.array(swapSchema).parse(swapsData);

// Popular products shown as chips on a fresh chat.
const STARTER_SWAP_OPTIONS = [
  "Confluence",
  "Typeform",
  "ChatGPT",
  "Claude",
  "Google Drive",
  "Google Analytics",
  "Notion",
  "Dropbox",
  "Firebase",
  "Shopify",
  "Trello",
  "Airtable",
  "Calendly",
  "Discord",
  "Intercom",
  "Mailchimp",
  "Miro",
  "Obsidian",
  "Zapier",
  "Zendesk",
];

// The agent passes the model's search_swaps arguments into this function.
export async function searchSwaps({ query }: { query: string }): Promise<ToolResult<SwapSummary[]>> {
  if (!query.trim()) return failure("Query required.");

  // Search the catalog for every entry that replaces this product or carries this tag.
  const matches = swaps.filter((swap) => matchesQuery(swap, query));

  if (matches.length === 0) return noResults("No swaps found matching that product.");

  return okResult(matches.map(toSwapSummary), `Found ${matches.length} open-source alternatives.`);
}

// Find a catalog project by name without changing its display name.
export function findSwapByProjectName(projectName: string): Swap | undefined {
  // Ignore capitalization, spaces, hyphens and dots, so "Paperless NGX" finds "Paperless-ngx".
  const normalize = (name: string) => name.toLowerCase().replaceAll(/[ .-]/g, "");
  return swaps.find((swap) => normalize(swap.name) === normalize(projectName));
}

// Read the GitHub owner and repository name from a swap's repo URL.
export function getRepoPath(swap: Swap): string {
  if (!swap.repo_url) return "";

  return new URL(swap.repo_url).pathname.slice(1).toLowerCase();
}

export function getStarterSwapOptions(): string[] {
  return STARTER_SWAP_OPTIONS;
}

// True when the swap's replaces list or tags contain the query.
function matchesQuery(swap: Swap, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  const matchesReplacement = swap.replaces.some((product) => product.toLowerCase() === normalizedQuery);
  const matchesTag = swap.tags.some((tag) => tag.toLowerCase() === normalizedQuery);

  return matchesReplacement || matchesTag;
}

function toSwapSummary(swap: Swap): SwapSummary {
  return swapSummarySchema.parse(swap);
}
