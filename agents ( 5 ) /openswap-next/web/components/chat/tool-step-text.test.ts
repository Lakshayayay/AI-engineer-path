import { describe, expect, it } from "vitest";
import { describeToolStep, type ToolPart } from "./tool-step-text";

// Tests build only the fields the function reads, so the fixtures stay short.
function part(fields: Record<string, unknown>): ToolPart {
  return { toolCallId: "call-1", ...fields } as unknown as ToolPart;
}

describe("describeToolStep", () => {
  it("shows a running label while the tool has no output yet", () => {
    expect(describeToolStep(part({ type: "tool-search_swaps", state: "input-available", input: { query: "Notion" } }))).toEqual({
      status: "running",
      text: "Searching the catalog...",
    });
    expect(describeToolStep(part({ type: "tool-web_search", state: "input-streaming" }))).toEqual({
      status: "running",
      text: "Searching the web...",
    });
  });

  it("counts the catalog matches", () => {
    const found = part({
      type: "tool-search_swaps",
      state: "output-available",
      input: { query: "Notion" },
      output: { status: "ok", retryable: false, message: "Found 2", result: [{}, {}] },
    });
    const none = part({
      type: "tool-search_swaps",
      state: "output-available",
      input: { query: "Zzz" },
      output: { status: "no_results", retryable: false, message: "No swaps" },
    });

    expect(describeToolStep(found)).toEqual({ status: "done", text: "Catalog: “Notion”, 2 found" });
    expect(describeToolStep(none)).toEqual({ status: "done", text: "Catalog: “Zzz”, none found" });
  });

  it("reports a health check, and flags an archived project", () => {
    const active = part({
      type: "tool-check_health",
      state: "output-available",
      input: { project_name: "AppFlowy", github_repo: null },
      output: { status: "ok", retryable: false, message: "AppFlowy: last commit 2 days ago.", result: { archived: false } },
    });
    const archived = part({
      type: "tool-check_health",
      state: "output-available",
      input: { project_name: "OldTool", github_repo: null },
      output: { status: "ok", retryable: false, message: "OldTool: last commit 900 days ago.", result: { archived: true } },
    });

    expect(describeToolStep(active)).toEqual({ status: "done", text: "AppFlowy: last commit 2 days ago." });
    expect(describeToolStep(archived).text).toBe("OldTool: last commit 900 days ago. (archived)");
  });

  it("shows the tool's own message when a tool returns an error", () => {
    const failed = part({
      type: "tool-check_health",
      state: "output-available",
      input: { project_name: "AppFlowy", github_repo: null },
      output: { status: "error", retryable: true, message: "GitHub rate limit reached." },
    });

    expect(describeToolStep(failed)).toEqual({ status: "error", text: "GitHub rate limit reached." });
  });

  it("says a web search and a Discord post are done", () => {
    const search = part({ type: "tool-web_search", state: "output-available", input: {}, output: {} });
    const sent = part({
      type: "tool-send_to_discord",
      state: "output-available",
      input: { message: "hi" },
      output: { status: "ok", retryable: false, message: "Posted to Discord.", result: { characters_sent: 2 } },
    });

    expect(describeToolStep(search)).toEqual({ status: "done", text: "Searched the web" });
    expect(describeToolStep(sent)).toEqual({ status: "done", text: "Sent to Discord" });
  });

  it("shows a plain failure when the SDK itself reports a tool error", () => {
    const broken = part({ type: "tool-send_to_discord", state: "output-error", input: {}, errorText: "stack trace here" });

    expect(describeToolStep(broken)).toEqual({ status: "error", text: "This step failed." });
  });
});
