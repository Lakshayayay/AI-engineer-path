# 🧞 Gift Genie

**Gift Genie** turns the hardest shopping question — *"what do I get them?"* — into a two-minute conversation. Tell it who the gift is for, and it asks the one question that actually matters (occasion, budget, taste), then streams back three thoughtful, well-reasoned picks with real prices, real stores, and a reason each one fits — grounded in a live web search, not guesswork.

---

## What it does

<p align="center">
  <img src="public/assets/appphotos/homepage.jpeg" width="720" alt="Gift Genie homepage with prompt starters" />
</p>

- **Conversational, not a form** — Ask for "something for my sister" and it asks one focused follow-up instead of a wall of dropdowns. Prompt starters on the homepage get you going even faster. Say "cheaper" or "more personal" later and it revises the same picks rather than starting over.
- **Location-aware pricing** — Detects your city automatically (no permission prompt) and prices everything in your local currency, from retailers that actually serve where you are — visible as the location pill in the header.
- **Sign in and keep your history** — Google sign-in saves every wish list to your account, browsable from the sidebar; skip it and the app runs entirely offline in guest mode with local history.
- **Grounded recommendations, not hallucinations** — Every suggestion is checked against a live web search, so you get real products from real retailers instead of invented brands or dead links.
- **Streamed, real-time replies** — Responses appear token-by-token as the model writes them, structured into clear numbered picks with why-it-fits, where-to-buy, and price range for each.

<p align="center">
  <img src="public/assets/appphotos/conversation.jpeg" width="720" alt="Gift Genie mid-conversation with a personalised recommendation" />
</p>

---

## Engineering

**Stack**

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, React 19) |
| Language | TypeScript |
| AI | Google Gemini via Vercel AI SDK, with search grounding (`google_search` tool) |
| AI fallback | Groq, swapped in automatically when the Gemini free quota is exhausted |
| Auth & DB | Supabase (Postgres + Auth, Row Level Security) |
| Validation | Zod |
| Styling | Vanilla CSS |

**Design**

- **Streaming-first API** — `/api/gift` is a single route handler built on `streamText` + `toUIMessageStreamResponse`, so tokens and citation sources reach the client as the model produces them instead of buffering a full response.
- **Provider fallback, not provider lock-in** — `lib/ai.ts` centralizes model selection behind one env flag (`AI_PROVIDER`), so swapping the underlying LLM is a config change, not a code change.
- **Dual-mode persistence** — `lib/db.ts` and `lib/auth.ts` transparently switch between Supabase (when configured) and `localStorage` (when not), so the app runs zero-config out of the box and upgrades to a real backend without touching UI code.
- **Server-owned prompt logic** — Location and conversation context are folded into the system prompt server-side (`buildSystemInstructions`) rather than trusting the client, keeping currency/locale rules and safety constraints (no invented products, no fake URLs) in one place.
- **Fail-soft by default** — Location detection, streaming errors, and auth all degrade gracefully (e.g. a failed IP lookup or a 429 from the model surfaces a plain message instead of breaking the chat).

---

## Getting started

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

No keys? It still runs — Gift Genie falls back to guest auth and local storage automatically. See [.env.example](.env.example) for the full list of variables.
