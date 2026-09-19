# PopChoice + PopStream

**PopChoice** is a quiz that recommends one movie for a group. **PopStream** is a Netflix-style dashboard over the same catalogue, with free-to-watch classics playable in-app.

Built with Next.js 16 (App Router), Supabase (Postgres + pgvector), Gemini via the Vercel AI SDK, and LangGraph.

## How it works

```
Wikidata + Wikipedia + OMDb + archive.org
        │  scripts/pipeline  (extract → transform → load)
        ▼
Supabase: movies · movie_chunks (768-dim embeddings + full-text) · watch_sources
        │  hybrid_search() = vector + keyword, merged with Reciprocal Rank Fusion
        ▼
src/lib/recommend.ts   LangGraph: plan → retrieve → grade → revise (loop) → pick
        │
        ├─ POST /api/chat        → PopChoice quiz   (src/app/(popchoice))
        └─ src/lib/movies.ts     → PopStream        (src/app/(stream): /browse, /title/[id], /watch/[id])
```

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the keys
```

1. Run `supabase/migrations/*.sql` in order (the last one, `005`, creates the current schema).
2. Load data: `npm run pipeline -- all --limit 100`.
3. `npm run dev`, then open `/` (quiz) or `/browse` (PopStream).

## Data pipeline

`npm run pipeline -- [extract|transform|load|all] [--limit N]`. Raw responses are cached in `data/raw/` (gitignored), and the load only re-embeds chunks whose text changed, so re-runs are cheap.

Free-tier limits to plan around:

| Service | Limit |
| --- | --- |
| OMDb | 1,000 requests/day |
| Gemini embeddings | 100 requests/minute (each chunk counts as one), plus a daily cap. Set `EMBED_DELAY_MS=65000` for larger loads. |
| Watchmode (optional) | 2,500 calls/month; "where to watch" is hidden without a key |

`CONTACT` (an email or URL) is required: Wikimedia asks every API client to identify itself in its User-Agent.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm run test:pipeline` | Unit tests for the pipeline's pure transform logic |

## Data and licensing

Plots are from Wikipedia (CC BY-SA), facts and posters from OMDb (CC BY-NC), and free films from the Internet Archive (only items confirmed playable and public domain). TMDB is deliberately not used because its terms forbid AI applications. PopStream is a non-commercial learning project.
