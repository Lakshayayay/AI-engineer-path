# agents ( 5 ): project facts

Shared rules, including build mode, are in the repo root `AGENTS.md`. This file only adds facts about this project.

- App: `next-agent/`, a Next.js 14 chat agent (TypeScript) with tool calling, using Groq via the Vercel AI SDK.
- Run: `cd next-agent && npm run dev` (http://localhost:3000). Needs `GROQ_API_KEY` in `next-agent/.env.local`.
- `ai`, `@ai-sdk/*` and `zod` are pinned to v4-era majors. The code uses `maxSteps`, `parameters` and `toDataStreamResponse`, which v7 renamed. Don't upgrade casually.
- Type check: `cd next-agent && npx tsc --noEmit`. Math parser check: `node --no-warnings lib/math.check.ts`.
