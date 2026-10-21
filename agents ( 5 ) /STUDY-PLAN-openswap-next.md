# Study plan: OpenSwap → openswap-next

**Written:** 2026-10-21 · **For:** Lakshay, and any Claude chat you open with this file
**Scope:** [openswap-next/](openswap-next/), compared with [OpenSwap/](OpenSwap/) (the one you already know)

---

## Start a lesson in a new chat

Paste this. Change the number to the "Next lesson" in STATUS.md. You start at Lesson 0, and go in order.

```
build mode · openswap-next · Lesson 0
Read "agents ( 5 )/STATUS.md", then "agents ( 5 )/STUDY-PLAN-openswap-next.md": section 4 (how each lesson runs) and Lesson 0. Teach me that lesson.
```

## End a lesson

Type **`wrap up the lesson`**. Claude then updates [STATUS.md](STATUS.md) and nothing else:

1. Ticks the lesson in the tracker.
2. Sets "Last done" and "Next lesson" under Now.
3. Updates "What exists" if code was added.
4. Writes 2–3 lines under Notes, in your words (Claude asks you for them), and one line per Decide answer under Decisions.
5. Adds any new problem found to "Spotted, not fixed".

This plan file stays fixed. It is the rules and the lessons; STATUS.md is where progress lives.

---

## 1. Where things stand (read first)

openswap-next started as a **skeleton**: env check, health route, the Nest CLI's tooling and the default Next page. The current state is in [STATUS.md](STATUS.md).

The plan has three phases:

| Phase | Lessons | What you do |
|---|---|---|
| **A. Read** | 0 to 4 | Reverse-engineer what exists, file by file |
| **B. Build and learn** | 5 to 17 | Port one old file at a time. You predict and OK the plan; AI writes the code; you review it and break it on purpose |
| **C. Job-ready** | 18 to 19 | Tests, evals, the production pass, and how you tell the story in an interview |

**Why Phase B goes bottom-up** (store → tools → loop → routes → UI): each piece can run and be tested alone before the model is involved. You always build on something that already works.

---

## 2. The picture: same boxes, new tech

The course diagram still holds. Only the labels change.

```
              Frontend                Backend                  Agent loop                      Provider
 OLD   index.html + ui.js      →  server.js (Express)  →  while loop in agent/index.js  →  openai SDK      → OpenAI
 NEW   web/ (Next.js, React,   →  api/ (NestJS)        →  streamText + stopWhen          →  @ai-sdk/openai  → OpenAI
            useChat)               controllers              (the AI SDK runs the loop)
                                       │                              │
                              conversations store           tools: search_swaps, check_health
                              (JSON file now, DB later)     (Zod schema + execute)
```

| Old way | New way | What it means, simply |
|---|---|---|
| You wrote the loop: `while`, push outputs, match `call_id` | The AI SDK runs the loop; you set the limits (`stopWhen`, `prepareStep`) | Less plumbing to write; more limits to choose |
| Wait for the whole answer, then show it | Stream text and tool progress live | The user sees words as they arrive |
| `JSON.parse` plus `if/else` on the tool name | `tool({ inputSchema, execute })` with Zod | The SDK checks the model's arguments for you |
| Plain JavaScript | TypeScript, strict mode | Many mistakes caught before the code runs |
| All Express routes in one file | Nest **modules**, **controllers** and **services** | The structure big teams use |
| DOM code by hand (`ui.js`) | React components and `useChat` | The screen is drawn from state |

---

## 3. Old file → new file map

New names marked * are proposals. Each build lesson confirms them in its "plan with me first" step.

| Job | Old OpenSwap | New openswap-next | Lesson |
|---|---|---|---|
| Env check | [environment.js](OpenSwap/environment.js) | [api/src/config/env.ts](openswap-next/api/src/config/env.ts) ✅ | 1 |
| Start the server | [server.js:8-11, 145-149](OpenSwap/server.js#L8-L11) | [main.ts](openswap-next/api/src/main.ts) ✅, [app.module.ts](openswap-next/api/src/app.module.ts) ✅ | 2 |
| Health check | none | [health/health.controller.ts](openswap-next/api/src/health/health.controller.ts) ✅ | 3 |
| Page shell and dev proxy | [index.html](OpenSwap/index.html), [vite.config.js](OpenSwap/vite.config.js) | [web/app/](openswap-next/web/app/), [next.config.ts](openswap-next/web/next.config.ts) 🟡 | 4, 14 |
| Chat title | [server.js:79-94](OpenSwap/server.js#L79-L94) | `api/src/agent/title.ts`* | 5 |
| Swaps database | [store/swaps.js](OpenSwap/store/swaps.js) | `api/src/store/swaps.service.ts`*, `tool-result.ts`* | 6 |
| GitHub health | [store/github.js](OpenSwap/store/github.js) | `api/src/store/github.service.ts`* | 7 |
| Conversations | [store/conversations.js](OpenSwap/store/conversations.js) | `api/src/store/conversations.service.ts`* | 8 |
| Prompts and tools | [agent/prompts.js](OpenSwap/agent/prompts.js), [agent/tools.js](OpenSwap/agent/tools.js) | `api/src/agent/prompts.ts`*, `tools.ts`* | 9 |
| Agent loop | [agent/index.js](OpenSwap/agent/index.js) | `api/src/agent/agent.service.ts`* | 10, 11 |
| Conversation routes | [server.js:19-52](OpenSwap/server.js#L19-L52) | `api/src/conversations/conversations.controller.ts`* | 12 |
| Chat route | [server.js:54-126](OpenSwap/server.js#L54-L126) (`/api/swaps`) | `api/src/chat/chat.controller.ts`* (`/api/chat`) | 13 |
| UI controller (state, network) | [frontend/index.js](OpenSwap/frontend/index.js) | `web/components/chat.tsx`* with `useChat` | 15 |
| UI views (drawing) | [frontend/ui.js](OpenSwap/frontend/ui.js), `icons.js`, `style.css` | `web/components/*.tsx`*, `*.module.css` | 16, 17 |

**Folder rule.** Our house shape stays: routes → `agent/` → `store/` → UI ([AGENTS.md](AGENTS.md), "Structure"). Nest's own docs group files by feature instead. We keep `agent/` and `store/` as role folders. Each route group gets its own folder, the way `health/` already does.

---

## 4. How each lesson runs

One lesson = one chat, about 45 to 90 minutes, in eight steps.

| # | Step | What happens | Who leads |
|---|---|---|---|
| 1 | **Recall** | Claude shows the old file's job in 3 lines. You say it back in one line. | You |
| 2 | **Predict** | Before you see new code: what changes in the new stack, and why? | You |
| 3 | **Concept** | The AI idea first, then the full-stack piece that carries it. One small table, plain words. | Claude |
| 4 | **Walk or build** | Built files: walk them block by block with `file:line`. Unbuilt files: file map → data flow → block steps → your OK → Claude writes it → walk it. | Both |
| 5 | **Break it** | Cause one failure on purpose. Watch what the code does. | You run it, Claude explains |
| 6 | **Run** | The lesson's check. Report real output, never "it should work". | Both |
| 7 | **Decide** | One real engineering question. Answer in your own words; Claude reviews it like a senior engineer. | You |
| 8 | **Log** | Say `wrap up the lesson`. Claude updates [STATUS.md](STATUS.md) (see "End a lesson" at the top). | You |

**Rules for Claude in every lesson**
- Follow [AGENTS.md](AGENTS.md): build mode, plan with me first, code standard, comment style.
- Small pieces. Don't spoil steps 2 and 7.
- Before writing AI SDK code, read the installed API in `node_modules/ai`, not memory. Version 7 renamed a lot (section 7).
- Before writing Next.js code, read `web/node_modules/next/dist/docs/` ([web/AGENTS.md](openswap-next/web/AGENTS.md) explains why).
- Match the old project's code shape: main function first, helpers below, one comment line per block.

---

## 5. Tracker

Moved to [STATUS.md](STATUS.md), so this file never changes while you learn.

---

## 6. Lessons

### Phase A: read what's built

#### Lesson 0 · The map, and run both apps

- **Goal:** see the whole system before reading any file.
- **Old:** one request end to end: [frontend/index.js:59](OpenSwap/frontend/index.js#L59) → [server.js:55](OpenSwap/server.js#L55) → [agent/index.js:9](OpenSwap/agent/index.js#L9) → [store/](OpenSwap/store/) → back.
- **New:** two apps in [openswap-next/](openswap-next/). `web` is Next.js 16.4 with React 19.3 (port 3000). `api` is NestJS 12 (port 3001).
- **Concepts:** why two apps (the web app draws pages; the API owns secrets, the agent and the data). What NestJS adds over Express: modules (boxes that group parts), controllers (routes), services (logic), and dependency injection (Nest builds each service once and hands it to whatever needs it).
- **Run:** old app with `npm run dev` in `OpenSwap/`. New: `npm run start:dev` in `api/`, `npm run dev` in `web/`. Open `localhost:3001/api/health`.
- **Decide:** one Next.js app with Route Handlers, or Next.js plus a separate NestJS API? What does each cost in deploys, streaming and team setup?

#### Lesson 1 · Env check: `environment.js` → `config/env.ts`

- **Old:** [environment.js:1-8](OpenSwap/environment.js#L1-L8) (variable lists), [:15-40](OpenSwap/environment.js#L15-L40) (load the file, or create one), [:42-55](OpenSwap/environment.js#L42-L55) (error), [:57-72](OpenSwap/environment.js#L57-L72) (log).
- **New:** [env.ts:8-17](openswap-next/api/src/config/env.ts#L8-L17) (schema), [:19](openswap-next/api/src/config/env.ts#L19) (type built from the schema), [:24](openswap-next/api/src/config/env.ts#L24) (checked once, at import), [:38-49](openswap-next/api/src/config/env.ts#L38-L49) (load `.env`; missing file is fine), [:52-60](openswap-next/api/src/config/env.ts#L52-L60) (error with names only), [:62-71](openswap-next/api/src/config/env.ts#L62-L71) (log without secrets).
- **AI concept:** the API key is your most expensive secret. It lives only on the server.
- **Full-stack:** Zod at a trust boundary. `z.coerce.number()`, because env vars are always strings. `.transform`, so an empty value counts as unset. `z.infer`: one schema gives both the check and the TypeScript type. Node's built-in `process.loadEnvFile` replaces the `dotenv` package. `import.meta.url` finds the file from both `src/` and `dist/`.
- **What changed:** `AI_KEY` became `OPENAI_API_KEY`. `AI_URL` is gone, because the provider package knows OpenAI's address. The file no longer creates `.env` for you, the Scrimba-only branch is gone, and the rest of the code reads one typed `env` instead of `process.env`.
- **Break it:** empty `AI_MODEL` in `api/.env`, then `PORT=abc`. Read both startup errors.
- **Decide:** check env at startup, or on first use? What breaks at 3am in each case?

#### Lesson 2 · Startup: `server.js` → `main.ts` + `app.module.ts`

- **Old:** [server.js:8-11](OpenSwap/server.js#L8-L11) (create app, parse JSON), [:145-149](OpenSwap/server.js#L145-L149) (listen).
- **New:** [main.ts:3-5](openswap-next/api/src/main.ts#L3-L5) (env imported first, and why), [:7-15](openswap-next/api/src/main.ts#L7-L15) (bootstrap), [:11](openswap-next/api/src/main.ts#L11) (`/api` prefix), [:17](openswap-next/api/src/main.ts#L17) (top-level `await`). [app.module.ts:4-7](openswap-next/api/src/app.module.ts#L4-L7) (the module lists its controllers).
- **Full-stack:** decorators such as `@Module` are labels Nest reads at startup. Express still runs underneath (`@nestjs/platform-express`), and Nest parses JSON bodies for you. With `"type": "module"` and `nodenext`, `.ts` files import each other with a `.js` ending. That surprises everyone once.
- **Break it:** remove `setGlobalPrefix`. Where did `/api/health` go?
- **Decide:** `/api` on the same domain, or a separate `api.` subdomain? What changes for cookies, CORS and the proxy?

#### Lesson 3 · Health route and the API's tooling

- **New:** [health.controller.ts:3-10](openswap-next/api/src/health/health.controller.ts#L3-L10). Scripts in [package.json:9-23](openswap-next/api/package.json#L9-L23). [tsconfig.json](openswap-next/api/tsconfig.json) (`strict` on line 18; decorator flags on lines 10-11). [nest-cli.json](openswap-next/api/nest-cli.json), [vitest.config.ts](openswap-next/api/vitest.config.ts), [vitest.config.e2e.ts](openswap-next/api/vitest.config.e2e.ts), [oxlint.json](openswap-next/api/oxlint.json), [.env.example](openswap-next/api/.env.example).
- **Old:** no health route, no TypeScript, no tests, no linter.
- **Concepts:** a health check is a cheap "are you alive?" route for uptime monitors and load balancers, and it spends no model credits. The build path: `src/*.ts` → `nest build` → `dist/*.js` → `start:prod`. Vitest runs unit tests (`*.spec.ts`) and end-to-end tests (`*.e2e-spec.ts`). oxlint is a fast linter. The decorator flags exist because dependency injection reads constructor types while the app runs.
- **Spot:** [oxlint.json:4](openswap-next/api/oxlint.json#L4) turns off `no-explicit-any`, which clashes with our "no `any`" rule. The `lint` and `format` scripts point at an empty `test/` folder.
- **Break it:** `GET /api/healthz`. Read Nest's built-in 404 JSON.
- **Run:** `curl localhost:3001/api/health`, `npm run build`, `npm run lint`.
- **Decide:** should `/api/health` also ping OpenAI and GitHub? Liveness or readiness: what does a load balancer do when the check fails?

#### Lesson 4 · The web skeleton: `index.html` + `vite.config.js` → `app/` + `next.config.ts`

- **Old:** [index.html](OpenSwap/index.html) (whole page), [vite.config.js:15-19](OpenSwap/vite.config.js#L15-L19) (proxy `/api` to port 3001).
- **New:** [layout.tsx:5-13](openswap-next/web/app/layout.tsx#L5-L13) (fonts), [:15-18](openswap-next/web/app/layout.tsx#L15-L18) (metadata, still "Create Next App"), [:20-26](openswap-next/web/app/layout.tsx#L20-L26) (root layout; `LayoutProps<"/">` is a built-in type). [page.tsx](openswap-next/web/app/page.tsx) (template, replaced in Lesson 14). [next.config.ts:5-6](openswap-next/web/next.config.ts#L5-L6). [web/AGENTS.md](openswap-next/web/AGENTS.md).
- **Honest note:** everything in `web/` is still generated. Even the two config flags are the new `create-next-app` defaults.
- **Full-stack:** App Router (folders are URLs). Server Components by default: they render on the server and send HTML, with no browser JavaScript unless a file says `"use client"`. Layout vs page. `next/font`. CSS Modules (class names scoped to one file). Next 16's two flags: `cacheComponents` (data is fresh on every request unless you mark it `"use cache"`; uncached parts stream in behind `<Suspense>`) and `partialPrefetching` (links prefetch one shared page shell). The docs ship inside the package at `web/node_modules/next/dist/docs/`.
- **Break it:** add `useState` to `page.tsx` without `"use client"`.
- **Run:** `npm run dev` in `web/`, then open `localhost:3000`.
- **Decide:** Server Component or Client Component for the starter chips? What moves to the browser in each case?

### Phase B: build and learn

**One-time setup, done inside Lesson 5**
- **Node.** AI SDK 7 needs Node 22 or newer and is tested on 22, 24 and 26. You have v25.6.1: it runs, but it isn't on that list. Use 24 LTS when you deploy.
- **Install, major version pinned.** `api/` gets `ai@^7` and `@ai-sdk/openai`. `web/` gets `ai@^7` and `@ai-sdk/react`. Pick the provider and React package versions that pair with `ai` 7 on npm.
- **Plan with me first** ([AGENTS.md](AGENTS.md)) applies to every build lesson: file map, data flow, block steps, then your OK.

#### Lesson 5 · First model call: the chat title

- **Old:** [server.js:13-17](OpenSwap/server.js#L13-L17) (OpenAI client), [:79-94](OpenSwap/server.js#L79-L94) (title through `responses.create`, read with `output_text`).
- **New:** `api/src/agent/title.ts`*: `generateTitle(userPrompt)` with `generateText`, using a provider built from the typed `env`.
- **AI concept:** provider + model + call. `generateText` waits for the whole answer; `streamText` sends it live. `instructions` is the v7 name for the system prompt. `result.text` is the old `output_text`. A side call like this still costs tokens.
- **Full-stack:** a Nest service (`@Injectable()`) and how it gets injected. Config comes from `env`, never straight from `process.env`.
- **Judgment:** the title is optional. If it fails, log a warning and fall back to the first user message, as [conversations.js:58-71](OpenSwap/store/conversations.js#L58-L71) did. Use the cheapest model that writes a good title.
- **Break it:** a wrong `AI_MODEL`. Read the provider error. Would the chat still be saved?
- **Run:** a small spec or script that prints a title for "I run a small university club. Replace Notion and Typeform."
- **Decide:** make the title before the answer streams, in parallel with it, or after it? What does each do to time-to-first-token and cost?

#### Lesson 6 · Swaps store: `store/swaps.js` → `store/swaps.service.ts`

- **Old:** [swaps.js:10-41](OpenSwap/store/swaps.js#L10-L41) `searchSwaps`, [:44-53](OpenSwap/store/swaps.js#L44-L53) `findSwapByProjectName`, [:56-63](OpenSwap/store/swaps.js#L56-L63) `getRepoPath`, [:70-88](OpenSwap/store/swaps.js#L70-L88) `matchesQuery`, [:90-111](OpenSwap/store/swaps.js#L90-L111) starter list, [:113-122](OpenSwap/store/swaps.js#L113-L122) fake delay.
- **New:** `api/src/store/tool-result.ts`* (the shared result type), `api/src/store/swaps.service.ts`*, and `swaps.json` moved across.
- **AI concept:** the tool-result contract `{ status, retryable, message, result }`. The `message` speaks to the model and tells it what to try next.
- **Full-stack:** a discriminated union. Because `status` is `"ok" | "no_results" | "error"`, TypeScript knows which other fields exist in each case. A `Swap` type that covers only the fields we use. Your first Vitest spec.
- **Judgment:** `SIMULATE_DB_FAILURE` and the fake delay were teaching props. Drop both, and let a test cause the failure instead.
- **Break it:** `searchSwaps({ query: "" })`, then `"Notion "` with a trailing space.
- **Run:** `npm test`, with one spec covering the ok, no_results and error cases.
- **Decide:** load `swaps.json` into memory at startup, or query on every request? When does each stop working?

#### Lesson 7 · GitHub health: `store/github.js` → `store/github.service.ts`

- **Old:** [github.js:4-56](OpenSwap/store/github.js#L4-L56) `checkHealth`, [:62-102](OpenSwap/store/github.js#L62-L102) `getRepoHealth` (three calls, one after another), [:104-126](OpenSwap/store/github.js#L104-L126) `fetchFromGitHub`, [:128-148](OpenSwap/store/github.js#L128-L148) `shapeRepoHealth`, [:150-179](OpenSwap/store/github.js#L150-L179) `describeGitHubFailure`.
- **New:** `api/src/store/github.service.ts`*.
- **AI concept:** grounding. The model may call a project "maintained" only when this tool says so. Shrink GitHub's data to the few fields the model needs, because every field costs tokens.
- **Full-stack:** `fetch` with `AbortSignal.timeout` (the old code had no timeout). Commits and releases fetched in parallel with `Promise.all` (the old code fetched them in turn). Zod-check GitHub's JSON, because outside data is a trust boundary. The token comes from the typed `env`.
- **Judgment:** map each status: 404 is no_results, 401 is not retryable, 403 and 429 are retryable, 5xx is retryable.
- **Break it:** a mocked `fetch` that returns 429, then one that never answers (the timeout should catch it).
- **Run:** a spec with mocked `fetch` (no network), then one real call.
- **Decide:** GitHub rate-limits you mid-chat. Retry inside the tool, or return `retryable: true` and let the model decide? Who should own retries?

#### Lesson 8 · Conversations store and the two histories

- **Old:** [conversations.js:8-13](OpenSwap/store/conversations.js#L8-L13) list, [:16-19](OpenSwap/store/conversations.js#L16-L19) get, [:22-36](OpenSwap/store/conversations.js#L22-L36) create, [:39-55](OpenSwap/store/conversations.js#L39-L55) save, [:73-81](OpenSwap/store/conversations.js#L73-L81) JSON read and write. [server.js:128-137](OpenSwap/server.js#L128-L137) is the allow-list.
- **New:** `api/src/store/conversations.service.ts`* and its data file.
- **AI concept:** two histories. The old app kept `chatHistory` (what the user sees) and `contextHistory` (the full model context, tool calls included). The AI SDK version: `UIMessage[]` (messages with `parts`: text, tool calls and more) and `ModelMessage[]` (what the model reads). `convertToModelMessages` turns the first into the second.
- **Full-stack:** keep the same small API (`create`, `get`, `list`, `save`), so moving to Postgres later changes one file. Type the records.
- **Judgment:** a JSON file loses data when two saves land at once, because the last write wins. That's fine while learning; Postgres comes later.
- **Break it:** fire two saves at the same moment and watch one disappear.
- **Run:** a spec that runs create → save → get → list and checks the order.
- **Decide:** store one history (UI messages, converted each turn) or two (visible and model context)? Weigh storage, privacy (raw tool data in the browser), and replaying old chats after a model change.

#### Lesson 9 · Prompts and tools: `prompts.js` + `tools.js` → `prompts.ts` + `tools.ts`

- **Old:** [prompts.js:1-16](OpenSwap/agent/prompts.js#L1-L16). [tools.js:1-40](OpenSwap/agent/tools.js#L1-L40) (JSON schemas). [agent/index.js:96-124](OpenSwap/agent/index.js#L96-L124) `runTool` (`JSON.parse` and an `if/else` on the name).
- **New:** `api/src/agent/prompts.ts`*, `api/src/agent/tools.ts`*.
- **AI concept:** a tool is a description (when to use it), an input schema (which arguments) and `execute` (your code). In the SDK that's `tool({ description, inputSchema: z.object(...), execute })`. The `tools` object *is* the `{ name: handler }` map. The SDK sends the schema to the model, checks the arguments, runs `execute`, and returns the result under the right call id.
- **Full-stack:** Zod becomes JSON Schema for you. `.describe()` holds the examples and limits, such as a maximum length. `.strict()` rejects extra properties, the old `additionalProperties: false`. Tools need services, so build them in a function that receives the services.
- **Spot:** [agent/index.js:98](OpenSwap/agent/index.js#L98) parses JSON outside the `try`, so one bad argument string crashes the whole run.
- **Judgment:** `execute` catches its own errors and returns the error shape. A tool failure never crashes the run.
- **Break it:** call `execute` with `{ query: 42 }`. Make `checkHealth` throw.
- **Run:** a spec that calls `tools.search_swaps.execute(...)` with no model involved.
- **Decide:** let the SDK reject bad input, or catch everything inside `execute`? What does the model see in each case?

#### Lesson 10 · Agent loop, part 1: `agent/index.js` → `agent/agent.service.ts`

- **Old:** [agent/index.js:9-71](OpenSwap/agent/index.js#L9-L71), the course's "Our Final Agent Loop" diagram.
- **New:** `api/src/agent/agent.service.ts`* using `streamText`.
- **The diagram, box by box:**

  | Diagram box | Old code | AI SDK 7 |
  |---|---|---|
  | `inputContext` | [:11-17](OpenSwap/agent/index.js#L11-L17) | `messages` (`ModelMessage[]`) |
  | Within turns limit? | [:20-24](OpenSwap/agent/index.js#L20-L24) | `stopWhen: isStepCount(MAX_STEPS)` |
  | Run `responses.create()` | [:29-34](OpenSwap/agent/index.js#L29-L34) | each **step** of `streamText` (one step = one model call) |
  | Add output items to `inputContext` | [:38-39](OpenSwap/agent/index.js#L38-L39) | done for you; read the response messages at the end |
  | Any tool calls? | [:41-44](OpenSwap/agent/index.js#L41-L44) | done for you |
  | Parse arguments, run local functions | [:55-59](OpenSwap/agent/index.js#L55-L59) | Zod checks them, then `execute` runs |
  | Append each result with matching `call_id` | [:65-69](OpenSwap/agent/index.js#L65-L69) | done for you |
  | Respond with `output_text` | [:46-52](OpenSwap/agent/index.js#L46-L52) | the text stream, and the full text at the end |

- **AI concept:** the SDK runs the loop; you own the limits and the tools. Surprise: `streamText` defaults to **one** step, so without `stopWhen` the model calls a tool and then stops.
- **Full-stack:** what the result object gives you: the text stream, each step, token usage.
- **Break it:** `MAX_STEPS = 1`. What does the user get?
- **Run:** one saved question from a script. Print each step's tool calls and its token usage.
- **Decide:** `streamText` with `stopWhen`, or the `ToolLoopAgent` class? When is the class worth it?

#### Lesson 11 · Agent loop, part 2: limits, forced final answer, errors

- **Old:** [agent/index.js:73-93](OpenSwap/agent/index.js#L73-L93) (last call with `tool_choice: "none"`), [prompts.js:13-16](OpenSwap/agent/prompts.js#L13-L16) (the final-answer prompt).
- **New:** the same `agent.service.ts`*.
- **AI concept:** on the last step, `prepareStep` returns `toolChoice: "none"` and the final-answer instructions. The model must then answer in text and say what it couldn't verify. Time limits: the `timeout` option (total, per step, per tool), `maxRetries`, and `abortSignal` (the user presses Stop).
- **Spot:** [agent/index.js:91](OpenSwap/agent/index.js#L91) returns `turnResponse.output_text`, not `finalResponse.output_text`. When the turns run out, the user never sees the forced answer. Work out why before you read the fix.
- **Full-stack:** `onError`; `onEnd` (the v7 name; `onFinish` still works but is deprecated); token usage for cost logs.
- **Break it:** make every tool return `no_results`. Watch the loop hit the limit and the final answer admit it.
- **Decide:** when the steps run out, force a final answer with tools off, or tell the user "I couldn't finish"? Weigh cost, honesty and UX.

#### Lesson 12 · Conversation routes: `server.js` → Nest controllers

- **Old:** [server.js:19-22](OpenSwap/server.js#L19-L22) popular software, [:24-31](OpenSwap/server.js#L24-L31) list, [:33-41](OpenSwap/server.js#L33-L41) create, [:43-52](OpenSwap/server.js#L43-L52) get, [:128-143](OpenSwap/server.js#L128-L143) allow-list and one error shape.
- **New:** `api/src/conversations/conversations.controller.ts`*, registered in `app.module.ts`.
- **Full-stack:** `@Get`, `@Post`, `@Param`. Thin routes: check, call, reply. A Zod validation pipe (a few lines of our own, or the `nestjs-zod` package; decide in the lesson). `NotFoundException` gives a 404, and Nest's built-in error handling gives one JSON error shape. `201` on create.
- **AI angle:** the allow-list keeps prompts, tool data and model context off the browser.
- **Spot:** [server.js:43-52](OpenSwap/server.js#L43-L52) returns 500 for an unknown id, because `getConversationForBrowser(null)` throws. It should be 404.
- **Break it:** `GET /api/conversations/nope`.
- **Run:** curl each route, then one e2e spec with supertest (already installed).
- **Decide:** a Zod pipe or class-validator DTOs (Nest's default)? One schema library or two?

#### Lesson 13 · Chat route: streaming the agent

- **Old:** [server.js:54-126](OpenSwap/server.js#L54-L126) (`/api/swaps`: check the input, load, title, run the agent, save, reply with JSON once).
- **New:** `api/src/chat/chat.controller.ts`*, `POST /api/chat`.
- **AI concept:** streaming over HTTP. The UI message stream sends text pieces, tool calls and tool results as events, and `useChat` reads them. In v7, `pipeUIMessageStreamToResponse({ response, stream: toUIMessageStream({ stream: result.stream }) })` writes the stream into Express's `res`. The older `result.pipeUIMessageStreamToResponse(res)` still works but is deprecated. Check against the installed version.
- **Full-stack:** `@Res()` hands you the raw Express response and turns off Nest's own reply. Check the body (chat id plus one new message, with a length limit). Return 404 before spending any credits. Save in `onEnd`. Make the title in parallel.
- **Judgment:** what if the browser disconnects mid-stream? What if the model fails after `200 OK` has already gone out? Status codes can't help then, so you send an error event.
- **Production gaps (mention only):** rate limits (`@nestjs/throttler`), auth, request IDs. [server.js:69](OpenSwap/server.js#L69) logs raw prompts.
- **Break it:** kill the API mid-answer. Send a 50,000-character message.
- **Run:** `curl -N` the route and watch the events arrive.
- **Decide:** the user closes the tab mid-stream. Keep running and save, or stop and save nothing?

#### Lesson 14 · Web shell: proxy, layout, server-loaded data

- **Old:** [vite.config.js:15-19](OpenSwap/vite.config.js#L15-L19) (proxy), [index.html:1-12](OpenSwap/index.html#L1-L12) (head), [frontend/index.js:13-31](OpenSwap/frontend/index.js#L13-L31) (chips and sidebar loaded in the browser).
- **New:** `next.config.ts` (`rewrites` send `/api/*` to port 3001), `app/layout.tsx` (real metadata), `app/page.tsx` (a Server Component loads the starter list and conversations), `lib/api.ts`* (server-side fetch helpers), `app/loading.tsx`* and `app/error.tsx`*.
- **Full-stack:** rewrites. Server Components fetch data before the HTML is sent, so the chips never flash in. With `cacheComponents`, uncached data sits behind `<Suspense>` or is marked `"use cache"`. Error boundaries.
- **Check:** does streaming survive the rewrite proxy without buffering? The AI SDK docs warn that proxies can break streaming.
- **Break it:** stop the API. What does the page show?
- **Decide:** proxy through Next rewrites, or call the API's address directly with CORS? Weigh streaming, cookies and the extra hop.

#### Lesson 15 · Chat controller: `frontend/index.js` → `components/chat.tsx` with `useChat`

- **Old:** [frontend/index.js:59-119](OpenSwap/frontend/index.js#L59-L119) `handleSwapRequest`, [:84-94](OpenSwap/frontend/index.js#L84-L94) (show the message at once), [:107-114](OpenSwap/frontend/index.js#L107-L114) (undo it on error), [:122-142](OpenSwap/frontend/index.js#L122-L142) `buildPrompt`, [:165-188](OpenSwap/frontend/index.js#L165-L188) fetch helpers.
- **New:** `web/components/chat.tsx`* (`"use client"`), `web/lib/build-prompt.ts`* (a pure function).
- **AI concept:** `useChat` is the controller. It gives you `sendMessage({ text })`, `messages` (with `parts`), `status` (`submitted` → `streaming` → `ready` or `error`), `stop()` and `error`. `DefaultChatTransport({ api: "/api/chat", prepareSendMessagesRequest })` lets you send only the new message and the chat id.
- **Full-stack:** a client component and React state. The old show-at-once-then-undo logic is now built in.
- **Break it:** double-click Send. Stop the API mid-stream.
- **Decide:** send the whole message list each turn, or only the new message and the chat id? Weigh payload size, tampering, and where the truth lives.

#### Lesson 16 · Views: `frontend/ui.js` → React components

- **Old:** [ui.js:95-135](OpenSwap/frontend/ui.js#L95-L135) (draw the history; Markdown plus DOMPurify at [:133](OpenSwap/frontend/ui.js#L133)), [:139-154](OpenSwap/frontend/ui.js#L139-L154) `formatPromptForDisplay`, [:181-240](OpenSwap/frontend/ui.js#L181-L240) (chips, `aria-pressed`), [:242-313](OpenSwap/frontend/ui.js#L242-L313) (loading and errors), [:320-360](OpenSwap/frontend/ui.js#L320-L360) (modes, submit label).
- **New:** `web/components/message-list.tsx`*, `starter-swaps.tsx`*, `prompt-form.tsx`*, `icons.tsx`*, and CSS Modules ported from `style.css`.
- **AI concept:** draw `message.parts`. Text parts become Markdown. Tool parts become live status, such as "Checking GitHub for Outline…", which the old app couldn't show.
- **Full-stack:** typed props, and no fetching inside views. A controlled textarea. Loading, error and empty states. Accessibility: labels, `aria-pressed`, `aria-live`. Safe Markdown: `react-markdown` (no raw HTML by default) or marked plus DOMPurify; decide in the lesson.
- **Break it:** get the model to output `<img src=x onerror=alert(1)>`. It must render harmless.
- **Decide:** show tool calls to the user, or hide them? Trust versus noise.

#### Lesson 17 · Sidebar, saved chats, routes

- **Old:** [frontend/index.js:34-57](OpenSwap/frontend/index.js#L34-L57) (new, open, show), [:158-163](OpenSwap/frontend/index.js#L158-L163) (move to top), [ui.js:156-179](OpenSwap/frontend/ui.js#L156-L179) (the list), [ui.js:362-402](OpenSwap/frontend/ui.js#L362-L402) (drawer: `inert`, Escape, focus trap), [index.html:15-48](OpenSwap/index.html#L15-L48).
- **New:** `web/app/c/[id]/page.tsx`* (open a saved chat by its URL), `web/components/sidebar.tsx`*.
- **Full-stack:** dynamic routes (`params` is a Promise in recent Next; confirm in the bundled docs). `<Link>` with partial prefetching. Load saved messages on the server and pass them to `useChat({ id, messages })`. Refresh the list after a send. Mobile drawer accessibility.
- **Break it:** open `/c/does-not-exist`. It should hit `notFound()` and show the 404 page.
- **Decide:** load a saved chat on the server, or in the browser after the page mounts? Weigh first paint, caching and stale data.

### Phase C: job-ready

#### Lesson 18 · Tests and evals

- **New:** `api/test/*.e2e-spec.ts`*, the specs from Lessons 6 to 9, and `api/evals/`* (5 saved questions with checks).
- **Concepts:** unit tests for tool handlers (no model). e2e tests for routes (supertest). A mock model for the loop (the AI SDK ships test helpers; check the v7 export name). Evals: saved questions run against the real model to catch prompt regressions. What can you assert about an answer that changes every run? Was the tool called? Is the project named? Is there no invented repo?
- **Decide:** which 5 questions go in the eval set, and what counts as a pass for each?

#### Lesson 19 · Production pass and your interview story

- Walk the "Production checklist" in [AGENTS.md](AGENTS.md): timeouts, a DB instead of JSON, input and rate limits then auth, context trimming, parallel calls, request-ID logs. Also treat tool output as data, never as instructions: a GitHub repo description could carry a prompt injection. Mention each gap; build only what you choose.
- Connect to the stages in [RESEARCH-gap-analysis.md](RESEARCH-gap-analysis.md): tracing, MCP and approvals come next.
- **Output:** your 2-minute project story: problem → architecture → one hard decision → one failure you handled.
- **Decide:** you get 10× the traffic tomorrow. Which three checklist items do you fix first, and why those?

---

## 7. AI SDK 7 names to know (checked 2026-10-21)

| Old (OpenAI SDK or older AI SDK) | AI SDK 7 | Status |
|---|---|---|
| `system` | `instructions` (`system` is deprecated) | ✅ migration guide |
| `maxTurns`, `maxSteps`, `stepCountIs(n)` | `stopWhen: isStepCount(n)` | ✅ migration guide |
| `tool_choice: "none"` | `toolChoice: "none"`, also settable per step in `prepareStep` | ✅ `streamText` reference |
| `parameters` (JSON Schema) | `inputSchema` (Zod) | ✅ migration guide |
| `onFinish` | `onEnd` (`onFinish` is a deprecated alias) | ✅ `streamText` reference |
| `result.pipeUIMessageStreamToResponse(res)` | `pipeUIMessageStreamToResponse({ response, stream: toUIMessageStream({ stream: result.stream }) })` | ✅ guide and Nest cookbook; the method form is deprecated |
| none | `timeout` (`totalMs`, `stepMs`, `toolMs`, …), `maxRetries` (default 2) | ✅ `streamText` reference |
| none | `ToolLoopAgent`, `toolApproval` | ✅ exist; not used until later |
| `useChat` with `input`, `handleSubmit` | `useChat({ id, transport })`, `sendMessage({ text })`, `status` | ✅ migration guide |
| **Not checked yet** | Is `convertToModelMessages` sync or async? How does bad tool input reach the model? What is the mock model's export name? Does streaming pass through Next rewrites? | ❓ check in the lesson |

---

## 8. Things I spotted (not fixed; they're lesson material)

| Where | What | Lesson |
|---|---|---|
| [OpenSwap/agent/index.js:91](OpenSwap/agent/index.js#L91) | Returns `turnResponse.output_text` after the forced final call; should be `finalResponse` | 11 |
| [OpenSwap/agent/index.js:98](OpenSwap/agent/index.js#L98) | `JSON.parse` outside `try`: bad arguments crash the run | 9 |
| [OpenSwap/server.js:43-52](OpenSwap/server.js#L43-L52) | Unknown conversation id gives 500, not 404 | 12 |
| [OpenSwap/store/github.js:117](OpenSwap/store/github.js#L117) | No timeout on `fetch`; three calls run one after another | 7 |
| [OpenSwap/server.js:69](OpenSwap/server.js#L69) | Logs the raw prompt | 13 |
| [OpenSwap/store/conversations.json](OpenSwap/store/conversations.json) | Chat data is tracked in git | 8 |
| [api/oxlint.json:4](openswap-next/api/oxlint.json#L4) | `no-explicit-any` is off, against our "no `any`" rule | 3 |
| [api/package.json:12, 17](openswap-next/api/package.json#L12) | `format` and `lint` point at an empty `test/` folder | 3 |
| [web/app/layout.tsx:16-17](openswap-next/web/app/layout.tsx#L16-L17) | Metadata still says "Create Next App" | 4 |
| [api/README.md](openswap-next/api/README.md), [web/README.md](openswap-next/web/README.md) | Generator boilerplate, not about OpenSwap | 19 |

---

## 9. How it all joins up

```
browser: useChat ──POST /api/chat──▶ Next rewrite ──▶ Nest ChatController (check input, load conversation)
                                                          │
                                                          ▼
                                     AgentService: streamText(instructions, messages, tools, stopWhen)
                                                          │  ▲
                                         each step ──▶ OpenAI  │ tool results
                                                          ▼  │
                                     tools.execute ──▶ SwapsService (swaps.json) / GitHubService (GitHub API)
                                                          │
             stream events (text, tool calls) ◀───────────┘
browser: draws message.parts live          onEnd ──▶ ConversationsService.save (two histories)
```

---

## Sources

- [AI SDK 7 migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0) (Node 22+, renames, deprecations)
- [`streamText` reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) (`toolChoice`, `prepareStep`, `onEnd`, `timeout`, stream helpers)
- [AI SDK NestJS cookbook](https://ai-sdk.dev/cookbook/api-servers/nest) (`@Res()` + `pipeUIMessageStreamToResponse`)
- Next.js 16.4.2 docs bundled at `openswap-next/web/node_modules/next/dist/docs/`: `01-app/01-getting-started/08-caching.md`, `01-app/02-guides/prefetching.md`
- This repo: [AGENTS.md](AGENTS.md), [RESEARCH-gap-analysis.md](RESEARCH-gap-analysis.md), [notes-openai-apis-in-vercel-ai-sdk.md](notes-openai-apis-in-vercel-ai-sdk.md)
