import { getEnv } from "../env";
import { failure, okResult, type ToolResult } from "../tool-result";

// Discord rejects a message longer than this.
const DISCORD_MESSAGE_LIMIT = 2000;
const DISCORD_TIMEOUT_MS = 10_000;

// The agent passes the model's send_to_discord arguments into this function.
export async function sendToDiscord({ message }: { message: string }): Promise<ToolResult<{ characters_sent: number }>> {
  const { DISCORD_WEBHOOK_URL } = getEnv();

  if (!DISCORD_WEBHOOK_URL) {
    return failure("Discord isn't set up on this server (no webhook is configured), so the message was not sent.");
  }

  const content = message.trim().slice(0, DISCORD_MESSAGE_LIMIT);

  if (!content) return failure("The message is empty. Write what to send, then call this tool again.");

  let response: Response;

  try {
    response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // An empty parse list stops the model's text from pinging @everyone, @here or roles.
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    console.error("Discord request failed:", error);
    return failure("Discord didn't respond, so the message may not have been sent.", true);
  }

  if (response.status === 429) return failure("Discord is rate limiting this webhook. Try again in a moment.", true);

  if (!response.ok) {
    return failure(`Discord rejected the message (status ${response.status}).`, response.status >= 500);
  }

  return okResult({ characters_sent: content.length }, "Posted to Discord.");
}
