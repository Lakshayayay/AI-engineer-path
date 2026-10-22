import { describe, expect, it } from "vitest";
import { getSources } from "./sources";

type Parts = Parameters<typeof getSources>[0];

describe("getSources", () => {
  it("lists each web link once, in the order the answer found them", () => {
    const parts = [
      { type: "source-url", sourceId: "1", url: "https://example.com/a", title: "Example A" },
      { type: "text", text: "..." },
      { type: "source-url", sourceId: "2", url: "https://example.org/b", title: "Example B" },
      { type: "source-url", sourceId: "3", url: "https://example.com/a", title: "Example A again" },
    ] as unknown as Parts;

    expect(getSources(parts)).toEqual([
      { url: "https://example.com/a", label: "Example A" },
      { url: "https://example.org/b", label: "Example B" },
    ]);
  });

  it("falls back to the site name when a source has no title", () => {
    const parts = [{ type: "source-url", sourceId: "1", url: "https://www.example.com/page" }] as unknown as Parts;

    expect(getSources(parts)).toEqual([{ url: "https://www.example.com/page", label: "www.example.com" }]);
  });

  it("drops links that are not http or https, so a page can't plant a javascript: link", () => {
    const parts = [
      { type: "source-url", sourceId: "1", url: "javascript:alert(1)", title: "Click me" },
      { type: "source-url", sourceId: "2", url: "not a url", title: "Broken" },
    ] as unknown as Parts;

    expect(getSources(parts)).toEqual([]);
  });
});
