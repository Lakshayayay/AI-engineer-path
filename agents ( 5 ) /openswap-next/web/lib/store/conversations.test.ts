import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir: string;

// The store reads its file path once on import, so point it at a temp folder before loading it.
async function loadStore() {
  vi.resetModules();
  return import("./conversations");
}

describe("conversations store", () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "openswap-"));
    await mkdir(path.join(tempDir, "data"));
    vi.spyOn(process, "cwd").mockReturnValue(tempDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("lists nothing before the first save", async () => {
    const store = await loadStore();

    expect(await store.listConversations()).toEqual([]);
  });

  it("stores only after save, and lists newest activity first", async () => {
    const store = await loadStore();
    const first = store.startConversation("11111111-1111-4111-8111-111111111111");
    const second = store.startConversation("22222222-2222-4222-8222-222222222222");

    expect(await store.getConversation(first.id)).toBeNull();

    await store.saveConversation({ ...first, title: "First" });
    await store.saveConversation({ ...second, title: "Second" });
    // Saving again replaces the record and moves it to the top.
    await store.saveConversation({ ...first, title: "First again" });

    const titles = (await store.listConversations()).map((summary) => summary.title);
    expect(titles).toEqual(["First again", "Second"]);
  });

  it("never sends the model context to the browser", async () => {
    const store = await loadStore();
    const conversation = {
      ...store.startConversation("33333333-3333-4333-8333-333333333333"),
      contextHistory: [{ role: "user" as const, content: "secret context" }],
    };

    expect(store.toBrowserConversation(conversation)).not.toHaveProperty("contextHistory");
  });
});
