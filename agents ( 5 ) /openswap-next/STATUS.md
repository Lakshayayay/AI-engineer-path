# openswap-next: study status

Where we stopped, so a new chat can start exactly here. The rules (reply style, explanation format, code standard) live in the repo-root `AGENTS.md`; this file does not repeat them.

Last updated: 2026-10-22

## How to resume

1. Say: `build mode · openswap-next · tools`
2. Ask for the one-page note on Feature 1 (Tools). The walkthrough is done and the note is not written yet.
3. Say "next" to move on to Feature 2 (Agent loop). The file open at the end was `web/lib/agent/swap-agent.ts`.

## Study method (agreed)

Build is finished; now study. One feature at a time, in this loop:

1. Recap the OpenSwap version in 2 lines.
2. Walk the new code: problem, parts, steps with `file:line` and why, flow, gaps.
3. Go back and forth: old vs new, and questions.
4. One-page note to save.
5. Move on.

Order is bottom-up, so each feature only uses things already seen. Frontend stays high level. When the study is done, delete the old `OpenSwap` (decided 2026-10-21).

## Plan and progress

All paths under `agents ( 5 ) /openswap-next/web/`. Old equivalents under `agents ( 5 ) /OpenSwap/`.

| # | Feature | New files | Old equivalent | Status |
|---|---|---|---|---|
| 0 | Warm-up: study the old OpenSwap (final-answer block, store the conversation, follow-ups) | n/a | `agent/index.js`, `server.js`, `store/conversations.js` | Done. Both one-page summaries were given in chat. |
| 1 | Tools | `lib/agent/tools.ts`, `lib/tool-result.ts`, `lib/store/swaps.ts`, `lib/store/github.ts` | `agent/tools.js`, `store/swaps.js`, `store/github.js` | Walkthrough done. One-page note pending. |
| 2 | Agent loop | `lib/agent/swap-agent.ts`, `lib/agent/prompts.ts` | `runAgent` in `agent/index.js` | Next |
| 3 | Conversation store | `lib/store/conversations.ts`, `lib/types.ts` | `store/conversations.js` | Not started |
| 4 | Chat route: send, title, follow-up | `app/api/chat/route.ts`, `lib/agent/title.ts`, `lib/http.ts` | `POST /api/swaps` | Not started |
| 5 | List and reopen | `app/api/conversations/route.ts`, `app/api/conversations/[id]/route.ts` | the GET/POST conversation routes | Not started |
| 6 | Frontend, high level | `app/page.tsx`, `components/chat/*` | `frontend/` | Not started |
| 7 | Glue: env, tests | `lib/env.ts`, `instrumentation.ts`, `*.test.ts` | `environment.js` | Not started |
| 8 | Auth: Google sign-in through Supabase | `proxy.ts`, `lib/supabase/*`, `app/login/page.tsx`, `app/auth/*/route.ts` | none (new) | Built. Not yet run end to end (needs the new Supabase project and Google client). |
| 9 | Per-user store: Postgres, Row Level Security, delete chat | `supabase/schema.sql`, `lib/store/conversations.ts` (rewritten), `lib/supabase/database.types.ts` | `store/conversations.js` (JSON file) | Built. Rows 3, 5 and 6 above now describe the Supabase version. |
| 10 | Personalization: saved preferences in the instructions | `lib/store/profiles.ts`, `app/api/profile/route.ts`, `app/settings/page.tsx`, `components/settings/settings-form.tsx`, `withPreferences` in `lib/agent/prompts.ts` | none (new) | Built |
| 11 | New tools: web search, Discord, GitHub repo for web finds | `lib/agent/tools.ts`, `lib/store/discord.ts`, `lib/store/github.ts` | none (new) | Built. Web search and Discord not yet tried against the real services. |
| 12 | UI: dark theme, tool step cards, sources, account menu | `app/globals.css`, `components/chat/tool-steps.tsx`, `tool-step-text.ts`, `sources.ts`, `brand-header.tsx` | `frontend/` | Built. Signed-in screens checked only with fake data. |

## What we learned so far

**Old OpenSwap: conversations**
- Two histories per conversation. `chatHistory` (questions and final answers) draws the screen and may go to the browser. `contextHistory` (tool calls, tool results, reasoning, answers) feeds the model and stays on the server.
- `runAgent` takes the saved `contextHistory` plus the new prompt and returns `{ swapAgentResponse, contextHistory }`. The route saves both.
- The title is a separate small model call with no tools, and it runs only when `chatHistory.length === 0`.
- The final-answer block runs only when all 5 turns are used up. It makes one more request with `tool_choice: "none"` so the model must answer in text. `tools` stays in the request because the history already holds tool calls.

**Feature 1: Tools (new stack)**
- Every tool returns `{ status, retryable, message, result }` (`lib/tool-result.ts`). The `message` tells the model what to try next.
- The catalogue is checked once at module load (`swaps.ts:31`). The model sees a smaller summary without `tags`.
- `search_swaps` matches exactly (`swaps.ts:88-95`), which is why the tool description asks for one word.
- `check_health` makes 3 GitHub calls. Repo and commit are required; releases are optional and only add a warning (`github.ts:88-110`).
- `tools.ts:8-32`: each tool is `tool({ description, inputSchema, strict, execute })`. Zod replaces the hand-written JSON schema, and the SDK validates arguments before `execute`, so no `JSON.parse` of your own. `runTool` (`tools.ts:35`) turns a thrown error into a `failure` result.

Stack versions in `web/package.json` (carets allow minor updates): `ai ^7.0.148`, `@ai-sdk/openai ^4.0.99`, `@ai-sdk/react ^4.0.152`, `next 16.4.2`, `zod ^4.6.7`.

## Open question from Feature 1

`search_swaps` only matches exactly, so "note taking app" finds nothing. Options: fuzzy match, embeddings (like PopChoice), or keep exact and rely on the prompt for one-word queries. Not decided.

## Known gaps (mention, don't fix unless asked)

| Gap | Where |
|---|---|
| No timeout on GitHub `fetch` | `lib/store/github.ts:125` |
| The 3 GitHub calls run one after another; commits and releases could be parallel | `lib/store/github.ts:88-110` |
| Without a `GITHUB_TOKEN`, GitHub's rate limit is low (about 60 an hour, from memory, not verified) | `lib/store/github.ts` |
| Exact-match search | `lib/store/swaps.ts:88-95` |
| Old OpenSwap: `GET /api/conversations/:id` returns 500, not 404, for a missing chat | `OpenSwap/server.js:44-52` |
| Old OpenSwap: final-answer block returns `turnResponse.output_text` instead of `finalResponse.output_text`, and `turnResponse` is out of scope there. Left unfixed because the old code will be deleted. | `OpenSwap/agent/index.js:95` |
| JSON-file store is unsafe for two requests at once | `store/conversations.js` in both projects |

## Housekeeping

- `openswap-next/api/` is untracked build output of an old NestJS app (no source). Decided: delete it. The delete was blocked during the upgrade build, so it is still there: run `rm -rf "openswap-next/api"` from `agents ( 5 )`. Its `.env` has empty values, so nothing is lost.
- The Supabase connection in Claude was still pointed at the old PopChoice project when the upgrade was built. Reconnect it to the new project before applying `web/supabase/schema.sql`, and regenerate `web/lib/supabase/database.types.ts` (it is hand-written for now).
