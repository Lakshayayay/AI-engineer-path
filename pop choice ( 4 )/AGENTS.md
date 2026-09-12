# Project Rules: Pop Choice (AI Engineering)

## 1. Project Overview & Mission
- **Application**: Pop Choice — an AI-powered intelligent movie recommendation application.
- **Core Stack**: Modern Web (Vite, Vanilla JS/CSS), Supabase (PostgreSQL + `pgvector`), OpenAI Embeddings & Chat Completion APIs, Supabase MCP tooling.
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
   - Vector Search: Always leverage PostgreSQL `pgvector` with indexed similarity matching (cosine distance `<=>`, IVFFlat / HNSW) and encapsulated Database Functions (`RPC`) for performant querying.
2. **Security & Configuration**:
   - Never commit sensitive service role keys to client bundles.
   - Separate configuration cleanly in `config.js` and `.env`.
3. **Modular Architecture**:
   - Maintain clear separation of concerns:
     - Configuration & clients (`config.js`)
     - Data processing & ingestion (`content.js`, ingestion scripts)
     - Core app logic & vector queries (`index.js`)
     - UI presentation & user experience (`index.html`, `index.css`)
4. **Resilience & UX**:
   - Handle asynchronous states gracefully (loading indicators, error boundaries, empty states).
   - Ensure the UI looks polished, modern, and production-grade.
