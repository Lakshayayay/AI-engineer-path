import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const WEBHOOK_URL = "https://discord.com/api/webhooks/123/token";

// getEnv() caches its result, so load a fresh copy of the module after each env change.
async function loadSendToDiscord() {
  vi.resetModules();
  return (await import("./discord")).sendToDiscord;
}

describe("sendToDiscord", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "test-model");
    vi.stubEnv("DISCORD_WEBHOOK_URL", WEBHOOK_URL);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("posts the message with mentions switched off", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const sendToDiscord = await loadSendToDiscord();

    const result = await sendToDiscord({ message: "AppFlowy looks healthy. @everyone" });

    expect(result.status).toBe("ok");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(WEBHOOK_URL);
    expect(init.method).toBe("POST");
    // An empty parse list means no @everyone, @here or role pings, whatever the model wrote.
    expect(JSON.parse(init.body)).toEqual({
      content: "AppFlowy looks healthy. @everyone",
      allowed_mentions: { parse: [] },
    });
  });

  it("cuts a long message to Discord's 2000 character limit instead of failing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const sendToDiscord = await loadSendToDiscord();

    await sendToDiscord({ message: "x".repeat(2500) });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).content).toHaveLength(2000);
  });

  it("tells the model Discord isn't set up when there is no webhook", async () => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const sendToDiscord = await loadSendToDiscord();

    const result = await sendToDiscord({ message: "hello" });

    expect(result).toMatchObject({ status: "error", retryable: false });
    expect(result.message).toMatch(/isn't set up/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty message without calling Discord", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const sendToDiscord = await loadSendToDiscord();

    const result = await sendToDiscord({ message: "   " });

    expect(result.status).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks a Discord rate limit as retryable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));
    const sendToDiscord = await loadSendToDiscord();

    const result = await sendToDiscord({ message: "hello" });

    expect(result).toMatchObject({ status: "error", retryable: true });
  });

  it("reports the status when Discord rejects the message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const sendToDiscord = await loadSendToDiscord();

    const result = await sendToDiscord({ message: "hello" });

    expect(result).toMatchObject({ status: "error", retryable: false });
    expect(result.message).toContain("404");
  });

  it("marks a timeout as retryable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    const sendToDiscord = await loadSendToDiscord();

    const result = await sendToDiscord({ message: "hello" });

    expect(result).toMatchObject({ status: "error", retryable: true });
  });
});
