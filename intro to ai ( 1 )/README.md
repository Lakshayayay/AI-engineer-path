# 🧞 Gift Genie

An AI-powered gift recommendation app that streams personalised suggestions in real time based on your input — built with Next.js, OpenAI, and Supabase.

---

## Features

- **Real-time AI Streaming** — Responses stream token-by-token using Server-Sent Events (SSE)
- **Web Search Tool** — OpenAI searches the web live for up-to-date recommendations
- **Authentication** — Email/password and Google OAuth via Supabase Auth
- **Wish History** — Past recommendations saved per user with Row Level Security
- **Offline Mode** — Works without any credentials using local mock auth and localStorage

---

## Stack

| Layer | Technology |
| :--- | :--- |
| Framework | Next.js 15+ (App Router) |
| Language | TypeScript |
| AI | OpenAI Responses API |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Validation | Zod |
| Styling | Vanilla CSS |

---

## Getting Started

```bash
npm install
cp .env.example .env   # Fill in your keys
npm run dev
```

No keys? The app also runs in offline mock mode — all features work locally.

---

## Environment Variables

See [.env.example](.env.example) for the full list of required variables.
