# 🧞 Gift Genie — Intro to AI Engineering (Lecture 01)

> **Part of the AI Engineering Path** — A series of hands-on projects built to teach real AI engineering concepts, one project at a time.

---

## What is this project?

**Gift Genie** is a full-stack AI web application that takes a natural language wish as input and streams personalised gift recommendations back to the user in real time — powered by OpenAI.

This is **Lecture 01** of the AI Engineering Path. The goal is not just to "use an API" but to understand the engineering decisions that make a production-grade AI application: streaming, security, auth, databases, and component architecture.

---

## 🎯 What I Built & Learnt

### Core AI Engineering Concepts

| Concept | What I Learnt |
| :--- | :--- |
| **OpenAI Responses API** | How to use `responses.create()` with `stream: true` and the `web_search` tool |
| **Streaming (SSE)** | How Server-Sent Events (SSE) stream tokens chunk-by-chunk from backend to browser |
| **ReadableStream** | The standard Web Streams API — `new ReadableStream({ start(controller) })` for real-time data pipelines |
| **TextEncoder / TextDecoder** | Encoding text to bytes on the server, decoding bytes back to text on the client |
| **Backend Security** | Why API keys must live server-side only — using Next.js Route Handlers as a secure proxy |
| **Zod Validation** | Runtime input validation — protecting the AI endpoint from invalid or malicious prompts |
| **Supabase (PostgreSQL + Auth)** | Row Level Security (RLS), cookie-based sessions with `@supabase/ssr`, dual-mode auth |

---

## 🚀 The AI Pipeline

```
[ User types a wish in the browser ]
          │
          ▼ POST /api/gift
[ Next.js Route Handler (server-side) ]
    - Validates prompt with Zod
    - Calls OpenAI Responses API (with web_search tool)
          │
          ▼ SSE Stream (token-by-token)
[ Browser reads chunks via Fetch Streams API ]
    - TextDecoder converts bytes → text
    - React setState() re-renders on every token
          │
          ▼
[ Real-time markdown output appears word-by-word ]
```

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Why |
| :--- | :--- | :--- |
| **Framework** | Next.js 15+ (App Router) | Full-stack, file-based routing, API routes, SSR |
| **Language** | TypeScript | Type safety, better DX, catches bugs at compile time |
| **AI** | OpenAI Responses API | Real-time streaming + web_search tool integration |
| **Database** | Supabase (PostgreSQL) | Production-grade, free tier, Row Level Security |
| **Auth** | Supabase Auth + Local Fallback | Email/password, Google OAuth, cookie-based sessions |
| **Validation** | Zod | Runtime schema validation for API requests |
| **Styling** | Vanilla CSS (glassmorphism) | Custom design system, no framework lock-in |
| **Streaming** | Web Streams API (SSE) | Standard, modern, no dependencies |

---

## 📁 Project File Structure

```
intro to ai ( 1 )/
│
├── app/
│   ├── api/
│   │   └── gift/
│   │       └── route.ts       ← The AI streaming Route Handler (backend)
│   ├── globals.css            ← Design system (glassmorphism, animations)
│   ├── layout.tsx             ← Root HTML shell
│   └── page.tsx               ← Main client controller (states, streaming, auth)
│
├── components/
│   ├── AuthModal.tsx          ← Sign in / Register modal UI
│   ├── GiftForm.tsx           ← Prompt textarea + magic lamp submit button
│   ├── Header.tsx             ← Top nav bar
│   ├── OutputDisplay.tsx      ← Real-time streaming markdown output card
│   └── Sidebar.tsx            ← History drawer + user profile
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts          ← Browser-side Supabase client (@supabase/ssr)
│   │   └── server.ts          ← Server-side Supabase client for Route Handlers
│   ├── auth.ts                ← Auth service (Supabase + localStorage fallback)
│   ├── db.ts                  ← DB service (Supabase PostgreSQL + localStorage fallback)
│   ├── openai.ts              ← OpenAI SDK init + SYSTEM_INSTRUCTIONS prompt
│   ├── schema.ts              ← Zod validation schemas
│   ├── types.ts               ← Shared TypeScript interfaces
│   └── utils.ts               ← Utility helpers
│
├── .env                       ← API keys (never committed to git)
├── next.config.mjs
├── tsconfig.json
└── package.json
```

---

## ⚙️ Features

- 🧞 **Real-time AI Streaming** — Tokens stream word-by-word using SSE (no waiting for full response)
- 🔍 **Web Search Tool** — OpenAI searches the web in real-time to give up-to-date gift recommendations
- 🔐 **Dual-Mode Auth** — Supabase Auth when credentials are set; local mock mode for zero-config dev
- 📜 **Wish History** — Saved to Supabase PostgreSQL with Row Level Security (each user sees only their own)
- 🛡️ **API Security** — OpenAI key is server-side only; Zod validates every incoming request
- 🎨 **Glassmorphism Design** — Premium purple/gold UI with animations and streaming cursor

---

## 🛠️ Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/Lakshayayay/AI-engineer-path.git
cd "AI-engineer-path/intro to ai ( 1 )"

# 2. Install dependencies
npm install

# 3. Set environment variables
cp .env.example .env
# Add your keys to .env

# 4. Run dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**No API keys? No problem.** The app runs in offline mock mode — all streaming and auth features work locally without any credentials.

---

## 🗝️ Environment Variables

```bash
# OpenAI (required for live AI responses)
AI_KEY=sk-...
AI_MODEL=gpt-4o

# Supabase (required for cloud auth + history)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🗄️ Supabase Setup (if using cloud mode)

Run this SQL in your Supabase project's SQL Editor:

```sql
create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prompt text not null,
  response_text text not null,
  created_at timestamp with time zone default now()
);

alter table public.wishes enable row level security;

create policy "Users read own wishes"
  on public.wishes for select using (auth.uid() = user_id);

create policy "Users insert own wishes"
  on public.wishes for insert with check (auth.uid() = user_id);
```

---

## 🧠 Key Engineering Principles Practiced

1. **Security First** — API keys never touch the browser. Next.js Route Handler acts as a secure proxy.
2. **Graceful Degradation** — App works offline with zero config. Cloud services layer on top.
3. **Streaming over Polling** — SSE is far more efficient than repeated REST polling for AI output.
4. **Separation of Concerns** — Auth, DB, AI logic, validation all live in separate, focused files.
5. **Type Safety** — TypeScript + Zod catch bugs before runtime, not after.

---

## 🗺️ AI Engineering Path — Series Overview

| # | Lecture | Project | Key Concept |
| :--- | :--- | :--- | :--- |
| **01** | Intro to AI | Gift Genie ← *you are here* | Streaming, Auth, Supabase, OpenAI API |
| 02 | *Coming soon* | — | — |
| 03 | *Coming soon* | — | — |

---

*Built with 🧞 by Lakshay Kalra as part of the AI Engineering Path.*
