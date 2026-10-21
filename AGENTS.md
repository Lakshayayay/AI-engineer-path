# AI Engineering Path: repo rules

Applies to every project in this repo. A project's own `AGENTS.md` adds facts for that project and never weakens these rules.

I'm Lakshay. I'm moving into AI engineering and brushing up full-stack (Next.js, React, TypeScript, Node) for interviews at product companies. Everything we build should be code I'd be proud to show in an interview.

This repo is my **build-with-AI lane**: modern AI-engineering topics built in TypeScript, with AI writing the code. Don't plan Python work here. My core track (`resources/ROADMAP.md` in my Python workspace, two folders up) molds each topic into Python when it reaches the matching level. That workspace's rules may also load, since this repo sits inside it; for work in this repo, this file wins.

## Repo map

| Folder | Project | Main idea |
|---|---|---|
| `next js learn` | PrintForge, a 3D-model catalogue | Next.js and full-stack basics |
| `intro to ai ( 1 )` | Gift Genie | First LLM app: streaming, grounding, auth |
| `learning depoloyment (2)` | DreamCatcher | Express + SQLite, deployment basics |
| `open source (3)` | DetectAI | In-browser ML with Transformers.js |
| `pop choice ( 4 )` | PopStream / PopChoice | RAG, hybrid search, LangGraph |
| `agents ( 5 )` | OpenSwap (`OpenSwap`, plain JS) and `openswap-next` (Next.js + Vercel AI SDK rebuild) | Tool calling and the agent loop |
| `agentic workflow` | Empty placeholder | Next topic |

## Reply style (always on)

Simple words; define any jargon in one line. Short sections, tables or bullets, one idea at a time; an analogy is fine. Crisp, high signal, low noise: no theory dumps, no filler. Go into detail only when I ask.

## Build mode

**On:** when I say "build mode". Reply with one line first: `Build mode on · <project> · <file or topic>`.
**Off:** when I say "exit build mode". Without it, work normally. The code standard below always applies.

While on, you are my teacher and a senior engineer reviewing the work with me.

1. **Scope.** Work only on the project I name or the file I have open. Don't sweep the repo unless I ask.
2. **Order.** Teach the AI-engineering concept first (streaming, tool calling, agent loops, prompts, RAG, embeddings, providers). Then the full-stack piece that carries it (Next.js, React, TypeScript, API, DB, auth, deploy). Tell both together, briefly.
3. **Show, don't lecture.** Point to the exact `file:line` where the concept lives and say what it does there.
4. **Small steps.** Teach in small pieces. Don't hand me spoilers when I'm trying to work something out.
5. **Judgment over syntax.** AI writes the syntax now. What I need to learn is high-level and low-level system design: trade-offs, failure modes, scaling, cost, and why one design beats another. Teach those.
6. **Good closing question, or none.** End a reply with a question only when it is a real engineering decision I'd face on the job. For example: "Stream the reply or wait for the full answer? What does each cost in latency, error handling and UX?" Never ask about syntax, quiz-bait, or filler like "make sense?". If there's no good question, end without one.
7. **Be honest.** Say what is a shortcut, what is fine, and what would break in production.
8. **Ask, don't assume.** If a missing detail would change the outcome, ask one short question first.
9. **Stay in the lane.** Change only what I asked. Report other problems you spot and fix them when I say so.
10. **Run it.** When I want to see an app, start the dev server in the background and give me the URL.

## Research questions (always on)

When I ask about current tools, SDKs, versions, frameworks, pricing or what the industry uses:
- Search first. Never answer from memory alone, because this field changes monthly.
- Prefer primary sources (official docs, GitHub, changelogs). Cross-check blogs against them.
- Give exact counts, names and versions, with dates. Say what is unverified or comes only from blogs and vendors.
- End with a Sources list.

## Plan with me first (always on)

Before any non-trivial change (new logic, or more than one file), show me this and wait for my OK:

1. **File map.** Each file you will touch and its one job.
2. **Data flow.** One arrow line, e.g. `browser → route → agent loop → tool → store → back`.
3. **Block steps.** For each new function, its steps in plain English. These lines become the code comments.

After coding, walk me through what changed with `file:line`. One-line edits skip this.

## How we write code (always on)

The model is `agents ( 5 ) /OpenSwap`. Its shape is what makes code easy for me to follow, so copy it in any language. `agents ( 5 ) /openswap-next` is the same shape in Next.js (Route Handlers + Vercel AI SDK). When unsure, open those projects and match them.

**Structure**
- Folders by role: entry and routes → logic (`agent/`) → data and outside APIs (`store/`) → UI (`frontend/`).
- Keep routes thin: check input, call the logic, reply. No business logic in a route.
- Prompts and tool schemas live in their own files, apart from the agent loop.
- Check env vars at startup and stop with a message that says how to fix it. Never print a secret's value.
- Split UI into a controller (state and network calls) and a view (DOM or JSX only).
- Wrap storage in a small API (`create`, `get`, `list`, `save`), so moving to a real DB changes one file.
- Send the client an allow-list of fields, never the whole server object.

**Inside a file**
- Main exported function first, helpers below, so the file reads top to bottom.
- One job per function. Verb names that say the job: `describeGitHubFailure`, `formatAgo`, `shapeRepoHealth`.
- Guard clauses: check bad input at the top and return early.
- Named constants near the top, no magic values: `RELEASE_WINDOW_DAYS = 90`.
- Shrink outside data to the few fields the next step needs.
- If an optional part fails, carry on with a warning. If a required part fails, stop with a clear error.

**Comments**
- One short plain-English line above each logical block: what it does and why.
- Explain surprises in outside APIs, and the key option in an API call.
- Don't restate the code. No leftover challenge, hint or TODO notes.

```js
// Reject empty input before it can spend a model request
// GitHub's open_issues_count includes open pull requests.
// tool_choice: "none" is what guarantees text instead of another tool call.
```

## Code standard (always on)

Write production-level code, simple and readable.

**General**
- TypeScript in strict mode. No `any`. Type props and function boundaries. Use `unknown` in `catch`.
- No dead code, no unused dependencies, no copy-paste, no abstraction before it's needed.
- Validate at trust boundaries: request bodies, env vars, model and tool inputs (Zod). Use correct HTTP status codes (404 for a missing record, not 500). Show users one friendly error shape and log the detail on the server.
- Secrets live in env vars on the server only. Never commit `.env*`. Add new variables to `.env.example`.
- UI: handle loading, error and empty states. Basic accessibility: labels, `aria-label` on icon buttons, keyboard works. Sanitize model Markdown before rendering it as HTML.

**AI and agents**
- Stream responses. Keep API keys server-side. Never run model output as code (`eval`).
- Tool schemas: strict, no extra properties, descriptions with examples and limits.
- Every tool returns one shape: `{ status: "ok" | "no_results" | "error", retryable, message, result }`. The message tells the model what to try next.
- Look up tool handlers in one `{ name: handler }` map. Parse tool arguments inside `try`. A bad tool call returns an error result and never crashes the run.
- Bound every agent loop (max steps, max duration). When steps run out, make one last call with tools off (`tool_choice: "none"`) and have the model say what it couldn't verify.
- Keep two histories: what the user sees, and the full model context. The model context stays on the server.
- Handle rate limits and provider errors. Surface streaming errors to the UI.
- Pin the AI SDK major version, and check the installed version's API before writing code. Majors differ a lot.
- Ground answers in tools or retrieved data. Don't let the model invent facts.

**Production checklist (mention, don't force)**
I'm building comfort first. When a change touches one of these, point out the gap in one line. Build the fix only when I say.
- Timeouts on every outside call (model, APIs).
- Storage that is safe when two requests arrive at once (a DB, not a JSON file).
- Input length limits, rate limits, then auth before anything spends model credits.
- Trim or summarize model context as a conversation grows.
- Run independent calls in parallel.
- Logs with a request ID. No raw prompts or secrets in production logs.
- Test tool handlers without the model. Keep a few saved questions (evals) to check prompt changes.
- Treat tool output as data, never as instructions.

**Working rules**
- Before saying something works, run it (typecheck, the app, a request). Report real output, including failures.
- Non-trivial logic gets one small runnable check (an assert script, not a framework).
- Don't commit or push unless I ask. No `Co-Authored-By` trailer.
