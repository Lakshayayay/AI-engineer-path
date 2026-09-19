---
name: pop-choice-guidelines
description: Core architecture, pedagogy, and development rules for Pop Choice app
always_on: true
---

# Project Rules: Pop Choice (AI Engineering)

## 1. Project Overview & Mission
- **Application**: Pop Choice — an AI-powered intelligent movie recommendation application.
- **Core Stack**: Next.js App Router (TypeScript, Tailwind), Supabase (PostgreSQL + `pgvector`), Gemini via the Vercel AI SDK, LangGraph for the recommendation flow, Supabase MCP tooling.
- **Goal**: Move from fundamental AI engineering concepts to a production-ready, industry-grade application through active, hands-on development ("learn by making").

---

## 2. Communication & Pedagogical Principles
1. **Senior Architect Perspective**:
   - Explain system design decisions, data flow, scaling considerations, and architectural trade-offs (e.g., client-side vs. server-side embedding generation, vector indexing choices, cost and latency profiles).
2. **Crisp & Accessible Language**:
   - Keep explanations straightforward, bite-sized, and free of unnecessary fluff.
   - Break down complex mathematical/AI concepts (embeddings, cosine similarity, semantic search, RAG) using intuitive, practical analogies.
3. **Theory Tied Directly to Code**:
   - Whenever introducing a new feature, briefly explain the "why" and underlying theory before writing or modifying code.
4. **Readable & Educational Code**:
   - Write clean, self-documenting, idiomatic JavaScript/SQL.
   - Include brief, meaningful comments highlighting critical architectural patterns.

---

## 3. Engineering & Production Standards
1. **Supabase & Database Practices**:
   - Active Supabase Project: `POP choice` (Ref: `bqprlhfixgcpfhxthrss`).
   - Use Supabase MCP tools (`list_tables`, `execute_sql`, `apply_migration`, `get_advisors`) to inspect and execute schema operations.
   - Vector Search: Always leverage PostgreSQL `pgvector` with indexed similarity matching (cosine distance `<=>`, HNSW) and encapsulated Database Functions (`RPC`, e.g. `hybrid_search`) for performant querying.
2. **Security & Configuration**:
   - Never commit sensitive service role keys to client bundles.
   - Keep secrets in `.env.local` (gitignored); document every variable in `.env.example`.
3. **Modular Architecture**:
   - Maintain clear separation of concerns:
     - Data access & vector queries (`src/lib/movies.ts`, `src/lib/watchmode.ts`)
     - Recommendation flow (`src/lib/recommend.ts`, `src/app/api/chat/route.ts`)
     - Data pipeline (`scripts/pipeline/`)
     - UI (`src/app/(popchoice)/` quiz, `src/app/(stream)/` PopStream)
4. **Resilience & UX**:
   - Handle asynchronous states gracefully (loading indicators, error boundaries, empty states).
   - Ensure the UI looks polished, modern, and production-grade.
