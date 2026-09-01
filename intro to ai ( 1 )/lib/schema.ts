import { z } from "zod";

/**
 * ==============================================================================
 * ZOD VALIDATION SCHEMAS
 * ==============================================================================
 * Zod validates data at RUNTIME (when users submit forms or send API calls)
 * and automatically infers static TypeScript types.
 */

// 1. Validates Server Environment Variables
export const EnvSchema = z.object({
  AI_KEY: z.string().optional(),
  AI_URL: z.string().url().optional(),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  PORT: z.string().default("3000"),
});

// 2. Validates the incoming Gift Request POST body
// Ensures the user doesn't submit empty text or extremely large payloads (DoS protection)
export const GiftRequestSchema = z.object({
  userPrompt: z
    .string()
    .trim()
    .min(3, "Please provide a more descriptive wish (at least 3 characters)")
    .max(2000, "Prompt is too long (maximum 2000 characters)"),
});

// Automatically extract the TypeScript type from the Zod schema
export type GiftRequestInput = z.infer<typeof GiftRequestSchema>;

// 3. User Authentication Validation Schemas
export const SignInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const SignUpSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
});
