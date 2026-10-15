# RESEARCH: Skill gaps for AI engineering roles

**Status:** Research, nothing built yet. **Date:** 2026-10-15. **Scope:** `agents ( 5 )`.
**Plan:** Vercel AI SDK (TypeScript), AI writes the code. No Python here: my core track (`resources/ROADMAP.md`, Python workspace) molds these topics into Python at its matching level.
**Use:** watch the lectures with section 6 in hand, then bring back what you learned and we close gaps by building.

---

## 1. Target roles

| Role | Language lean | What it stresses | Evidence |
|---|---|---|---|
| **AI full-stack engineer** | TypeScript | Next.js, Postgres, Vercel AI SDK, LLM features, product ownership | One senior posting (closed) and job-board listings |
| **Applied AI / LLM engineer** | Python | RAG, agents, tool use, evals, monitoring | A remote posting, a Scale AI evals role, hiring guides |
| **Python backend + AI developer** | Python | FastAPI, LangGraph, vector DBs, Docker/K8s, Azure/AWS | A Toptal listing and HN threads |
| **Enterprise AI engineer** | Python, TS or Java | Agents wired into company systems, security, evals, observability | GM AI Agent Engineer posting (read in full) |
| **Forward deployed engineer (FDE)** | Python | Customer-facing builds, MCP servers, evals, deployment | Anthropic FDE posting (closed, read in full) |

**Trust level: directional.** Every source is a small sample (a few postings, one job board, one person's tally of 15 senior roles). Title overlap is heavy: one guide says "AI engineer" now covers seven different jobs. To firm this up, collect 20 postings from your target companies.

---

## 2. What each role asks for

● core  ○ often or a plus  – not seen. This is my reading of the evidence above.

| Skill | Full-stack AI | Applied AI | Python backend | Enterprise | FDE |
|---|:-:|:-:|:-:|:-:|:-:|
| Python | ○ | ● | ● | ● | ● |
| TypeScript / Next.js | ● | – | – | ○ | ○ |
| Agents and tool use | ● | ● | ● | ● | ● |
| RAG, embeddings, vector search | ● | ● | ● | ● | ○ |
| Evals | ○ | ● | ○ | ● | ● |
| Tracing, monitoring | – | ● | ● | ● | ○ |
| MCP | – | ○ | – | ○ | ● |
| Docker, cloud, CI/CD | ○ | ○ | ● | ○ | ○ |
| Kubernetes | – | – | ○ | – | – |
| Security, IAM, governance | – | – | – | ● | ○ |
| Customer scoping and communication | – | – | – | – | ● |
| End-to-end product ownership | ● | ○ | ○ | ○ | ● |

**Takeaway:** agents, RAG and evals are required almost everywhere. Python is core in four of five. You are strongest on the first column.

---

## 3. What you already have

| Have | Where |
|---|---|
| Streaming, tool calling, agent loop, Zod-validated tools, strict TypeScript | next-agent |
| LLM app with search grounding, provider fallback, auth and Row Level Security | Gift Genie |
| RAG, pgvector, hybrid search, LangGraph corrective RAG, data pipeline, structured output | PopStream |
| Express + SQLite REST API | DreamCatcher |
| AI coding tool fluency (Claude Code) | daily work |

Limits: next-agent is on AI SDK **v4** (current is v7). The only test is a small math check. I haven't verified that anything is deployed.

---

## 4. Gaps

✅ have  🟡 partial  ❌ gap  → core: owned by my Python core track (level shown). Priority: **P0** needed in most roles, **P1** often, **P2** bonus.

| Area | Topic | Status | Priority |
|---|---|:-:|:-:|
| Agent core | Loop, tools, streaming | ✅ | – |
| | AI SDK v7 (`ToolLoopAgent`, new `useChat`, message parts) | ❌ | P0 |
| | Memory and context management | ❌ | P0 |
| | Structured output | 🟡 | P0 |
| | Human approvals (`toolApproval`) | ❌ | P1 |
| | Multi-agent patterns (agent-as-tool, handoffs, supervisor) | 🟡 | P1 |
| | Durable, resumable agents | ❌ | P2 |
| Quality | **Evals** (golden sets, LLM-as-judge, regression in CI) | ❌ | P0 |
| | **Tracing and monitoring** (Langfuse, same tool as the core track) | ❌ | P0 |
| | **Tests** (unit and agent-level) | ❌ | P0 |
| | Cost, latency, token tracking; retrieval evals | ❌ | P1 |
| Integration | RAG, embeddings, hybrid search | ✅ | – |
| | **MCP** (build one server, one client) | ❌ | P0 |
| | Enterprise APIs, OAuth, RBAC | 🟡 | P1 |
| | Messy data (CSV, PDF, SQL) | → core L1–L2 | P2 |
| Safety | Guardrails, prompt injection, least privilege, PII | ❌ | P1 |
| Production | Docker, CI/CD, cloud deploy | ❌ | P1 |
| | Rate limits, retries, queues | 🟡 | P1 |
| | Kubernetes | → core L6 | P2 |
| Python | **Python, async, Pydantic, pytest** | → core L0 (async L3) | P0 |
| | FastAPI | → core L3 | P1 |
| | OpenAI Agents SDK, LangGraph in Python | → core L3/L6 | P1 |
| Non-code | Scoping a vague problem in writing, demos, status updates | → core (client pack) | P0 for FDE |
| | One domain (finance, healthcare) | ❌ | P2 |

Later: fine-tuning, self-hosting (vLLM), A2A, voice, computer use.

---

## 5. Framework lens

Checked on official pages: AI SDK 7 shipped 2026-06-25, needs Node 22+, and has a codemod (`npx @ai-sdk/codemod v7`). OpenAI's Agents SDK has TypeScript and Python versions.

| OpenAI Agents SDK | Vercel AI SDK (my mapping, verify as we build) |
|---|---|
| `Agent` + `run()` | `ToolLoopAgent` or `streamText` with a step limit |
| Human in the loop | `toolApproval` |
| Tracing | Telemetry (`@ai-sdk/otel`) |
| Sessions | You store messages yourself |
| Guardrails | No built-in version: Zod plus your own checks |
| Handoffs | An agent that calls another agent as a tool |

Depth: **Vercel AI SDK deep. OpenAI Agents SDK: this table only. Python frameworks: core track (Level 3/6).**

---

## 6. Questions for the lectures

1. What loop does the agent run, and what ends it?
2. How is memory passed between runs?
3. How are tool arguments checked, and what happens when a tool fails?
4. How do multiple agents hand off work?
5. How does it trace what happened, and is there any eval?
6. Where could user input make it do harm?

---

## 7. Proposed path (to confirm)

| Stage | Build | Closes |
|---|---|---|
| 0 | Migrate next-agent to v7 | v7 |
| 1 | Add memory, structured output, approvals | Agent core |
| 2 | Add evals, tracing, tests | Quality |
| 3 | Build an MCP server and connect it | MCP, integration |
| 4 | Multi-agent split plus guardrails | Safety |
| 5 | Docker, CI, deploy | Production |

**Decided (2026-10-15):** no master project here; the core track's P6.M is the one. No Python here; the core track molds each topic at its level.

---

## Sources

- [Anthropic FDE posting (mirror)](https://jobs.generalcatalyst.com/companies/anthropic/jobs/70192292-forward-deployed-engineer-applied-ai)
- [GM AI Agent Engineer posting](https://search-careers.gm.com/en/jobs/jr-202606937/ai-agent-engineer/)
- [Toptal Python backend with RAG and agentic AI](https://freehire.me/jobs/python-backend-development-talent-with-rag-and-agentic-ai-experience-toptal-i7tbxd2u)
- [Senior Full-Stack Engineer, Next.js / AI](https://dynamitejobs.com/company/acquisity/remote-job/senior-full-stack-engineer-next-js-ai)
- [Scale AI Evals Engineer, Applied AI](https://job-boards.greenhouse.io/scaleai/jobs/4629589005)
- [Applied AI engineer guide](https://skillscouter.com/how-to-become-an-applied-ai-engineer/)
- [534-listing analysis](https://agentic-engineering-jobs.com/langchain-job-market-2026) (biased toward LangChain roles)
- [15 principal-level JDs](https://github.com/kannguyen1/agent-research-book/blob/main/docs/328-roadmap-to-principal-agentic-ai-engineer.md) (small sample)
- [AI SDK 7 announcement](https://vercel.com/blog/ai-sdk-7) and [migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)
- [openai/openai-agents-js](https://github.com/openai/openai-agents-js)
