import { z } from "zod";

// An empty value in .env.local counts as unset.
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1),
  GITHUB_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  DISCORD_WEBHOOK_URL: z.preprocess(emptyToUndefined, z.url().optional()),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

// Checked once, then reused. It runs lazily so `next build` works without keys.
export function getEnv(): Env {
  cachedEnv ??= parseEnv();
  return cachedEnv;
}

// Called at server start (instrumentation.ts), so a bad config stops the app early.
export function logEnv(): void {
  const env = getEnv();
  console.log(`[env] AI_MODEL: ${env.AI_MODEL}`);

  // Log only whether secrets exist, never their values.
  console.log("[env] OPENAI_API_KEY: set");
  if (!env.GITHUB_TOKEN) {
    console.warn("[env] GITHUB_TOKEN not set: GitHub health checks use the low anonymous rate limit.");
  }
  if (!env.DISCORD_WEBHOOK_URL) {
    console.warn("[env] DISCORD_WEBHOOK_URL not set: the send_to_discord tool will tell the user Discord isn't set up.");
  }
}

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  // Name the bad variables and how to fix them, without echoing any value.
  const problems = parsed.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
  throw new Error(
    `Invalid environment variables:\n${problems.join("\n")}\n` +
      "Copy web/.env.example to web/.env.local, fill in the values, then restart the server.",
  );
}
