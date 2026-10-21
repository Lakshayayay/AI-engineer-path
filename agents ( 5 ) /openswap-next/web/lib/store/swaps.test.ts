import { describe, expect, it } from "vitest";
import { findSwapByProjectName, getRepoPath, searchSwaps } from "./swaps";

describe("swaps store", () => {
  it("finds alternatives by the product they replace, ignoring case", async () => {
    const result = await searchSwaps({ query: "notion" });

    expect(result.status).toBe("ok");
    expect(result.result?.length).toBeGreaterThan(0);
    // The model never sees the bulky tag list.
    expect(result.result?.[0]).not.toHaveProperty("tags");
  });

  it("reports no_results for an unknown product", async () => {
    const result = await searchSwaps({ query: "definitely-not-a-product" });

    expect(result).toMatchObject({ status: "no_results", retryable: false });
  });

  it("rejects an empty query", async () => {
    expect((await searchSwaps({ query: "  " })).status).toBe("error");
  });

  it("matches project names ignoring spaces, hyphens and dots", () => {
    const swap = findSwapByProjectName("open hands");

    expect(swap?.name).toBe("OpenHands");
    expect(getRepoPath(swap!)).toMatch(/^[^/]+\/[^/]+$/);
  });
});
