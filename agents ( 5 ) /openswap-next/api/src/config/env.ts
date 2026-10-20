import { Logger } from '@nestjs/common';
import { z } from 'zod';

const DEFAULT_PORT = 3001;
// Resolved from this file, so it finds api/.env from both src/ and dist/.
const ENV_FILE = new URL('../../.env', import.meta.url);

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1),
  // Optional: an empty value in .env counts as "not set".
  GITHUB_TOKEN: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT),
});

export type Env = z.infer<typeof envSchema>;

const logger = new Logger('Env');

// Checked once when this file is first imported, so a bad setup stops the API at startup.
export const env: Env = loadEnv();

function loadEnv(): Env {
  loadEnvFile();

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(describeEnvProblems(parsed.error));
  }

  logConfiguredEnv(parsed.data);
  return parsed.data;
}

function loadEnvFile(): void {
  try {
    process.loadEnvFile(ENV_FILE);
  } catch (error: unknown) {
    // No .env file is fine: a host such as a deploy platform sets the variables itself.
    if (!isMissingFileError(error)) throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

// Names and reasons only. A secret's value is never printed.
function describeEnvProblems(error: z.ZodError): string {
  const problems = error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`);

  return [
    'Invalid environment variables:',
    ...problems,
    'Copy api/.env.example to api/.env, fill in the values, then restart the API.',
  ].join('\n');
}

function logConfiguredEnv(config: Env): void {
  logger.log('OPENAI_API_KEY: configured');
  logger.log(`AI_MODEL: ${config.AI_MODEL}`);

  if (config.GITHUB_TOKEN) {
    logger.log('GITHUB_TOKEN: configured');
  } else {
    logger.warn('GITHUB_TOKEN not set: GitHub health checks use the low anonymous rate limit.');
  }
}
