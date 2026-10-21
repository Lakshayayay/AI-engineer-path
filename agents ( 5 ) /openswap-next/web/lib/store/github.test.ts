import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkHealth } from "./github";

const DAY_MS = 24 * 60 * 60 * 1000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("checkHealth", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "test-model");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns no_results for a project that is not in the catalog", async () => {
    const result = await checkHealth({ projectName: "Not A Project" });

    expect(result.status).toBe("no_results");
  });

  it("shapes repo, commit and release data into health facts", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * DAY_MS).toISOString();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ archived: false, open_issues_count: 4, stargazers_count: 99 }))
        .mockResolvedValueOnce(jsonResponse([{ commit: { committer: { date: tenDaysAgo } } }]))
        .mockResolvedValueOnce(jsonResponse([{ tag_name: "v1.0.0", published_at: tenDaysAgo }])),
    );

    const result = await checkHealth({ projectName: "OpenHands" });

    expect(result.status).toBe("ok");
    expect(result.result).toMatchObject({
      archived: false,
      days_since_last_commit: 10,
      latest_version: "v1.0.0",
      releases_last_90_days: 1,
      open_issues: 4,
    });
  });

  it("marks a rate limit as retryable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "rate limit" }, 429)));

    const result = await checkHealth({ projectName: "OpenHands" });

    expect(result).toMatchObject({ status: "error", retryable: true });
  });
});
