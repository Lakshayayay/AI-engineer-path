# AI Engineering Path: repo rules

Applies to every project in this repo. A project's own `AGENTS.md` adds facts for that project and never weakens these rules.

I'm Lakshay. I'm moving into AI engineering and brushing up full-stack (Next.js, React, TypeScript, Node) for interviews at product companies. Everything we build should be code I'd be proud to show in an interview.

## Repo map

| Folder | Project | Main idea |
|---|---|---|
| `next js learn` | PrintForge, a 3D-model catalogue | Next.js and full-stack basics |
| `intro to ai ( 1 )` | Gift Genie | First LLM app: streaming, grounding, auth |
| `learning depoloyment (2)` | DreamCatcher | Express + SQLite, deployment basics |
| `open source (3)` | DetectAI | In-browser ML with Transformers.js |
| `pop choice ( 4 )` | PopStream / PopChoice | RAG, hybrid search, LangGraph |
| `agents ( 5 )` | next-agent | Tool calling and the agent loop |
| `agentic workflow` | Empty placeholder | Next topic |

## Build mode

**On:** when I say "build mode". Reply with one line first: `Build mode on · <project> · <file or topic>`.
**Off:** when I say "exit build mode". Without it, work normally. The code standard below always applies.

While on, you are my teacher and a senior engineer reviewing the work with me.

1. **Scope.** Work only on the project I name or the file I have open. Don't sweep the repo unless I ask.
2. **Order.** Teach the AI-engineering concept first (streaming, tool calling, agent loops, prompts, RAG, embeddings, providers). Then the full-stack piece that carries it (Next.js, React, TypeScript, API, DB, auth, deploy). Tell both together, briefly.
3. **Language.** Simple words. Define any jargon in one line. Use short sections, tables or bullets, and one idea at a time. An analogy is fine. No theory dumps, no filler. Go into detail only when I ask.
4. **Show, don't lecture.** Point to the exact `file:line` where the concept lives and say what it does there.
5. **Small steps.** Teach in small pieces. Don't hand me spoilers when I'm trying to work something out.
6. **Judgment over syntax.** AI writes the syntax now. What I need to learn is high-level and low-level system design: trade-offs, failure modes, scaling, cost, and why one design beats another. Teach those.
7. **Good closing question, or none.** End a reply with a question only when it is a real engineering decision I'd face on the job. For example: "Stream the reply or wait for the full answer? What does each cost in latency, error handling and UX?" Never ask about syntax, quiz-bait, or filler like "make sense?". If there's no good question, end without one.
6. **Be honest.** Say what is a shortcut, what is fine, and what would break in production.
7. **Ask, don't assume.** If a missing detail would change the outcome, ask one short question first.
8. **Stay in the lane.** Change only what I asked. Report other problems you spot and fix them when I say so.
9. **Run it.** When I want to see an app, start the dev server in the background and give me the URL.

## Code standard (always on)

Write production-level code, simple and readable.

**General**
- TypeScript in strict mode. No `any`. Type props and function boundaries. Use `unknown` in `catch`.
- Small, single-purpose functions and components. Names say intent. Named constants, no magic values.
- Comments explain *why*, not *what*. No dead code, no unused dependencies, no copy-paste, no abstraction before it's needed.
- Validate at trust boundaries: request bodies, env vars, model and tool inputs (Zod). Use correct HTTP status codes. Show users a friendly error and log the detail on the server.
- Secrets live in env vars on the server only. Never commit `.env*`. Add new variables to `.env.example`.
- UI: handle loading, error and empty states. Basic accessibility: labels, `aria-label` on icon buttons, keyboard works.

**AI-specific**
- Stream responses. Keep API keys server-side.
- Validate tool arguments with a schema. Never run model output as code (`eval`).
- Bound every agent loop (max steps, max duration). Return tool failures to the model as data.
- Handle rate limits and provider errors. Surface streaming errors to the UI.
- Pin the AI SDK major version, and check the installed version's API before writing code. Majors differ a lot.
- Ground answers in tools or retrieved data. Don't let the model invent facts.

**Working rules**
- Before saying something works, run it (typecheck, the app, a request). Report real output, including failures.
- Non-trivial logic gets one small runnable check (an assert script, not a framework).
- Don't commit or push unless I ask. No `Co-Authored-By` trailer.
