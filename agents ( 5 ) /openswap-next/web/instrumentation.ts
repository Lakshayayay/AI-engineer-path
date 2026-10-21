// Runs once when the server starts, before it takes any request.
export async function register(): Promise<void> {
  // The env check uses Node APIs, so skip it on the Edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logEnv } = await import("./lib/env");
  logEnv();
}
