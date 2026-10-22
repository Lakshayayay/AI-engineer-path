# OpenSwap Next

Find open-source alternatives to popular software by chatting with an agent. Built with Next.js, the Vercel AI SDK and Supabase.

- **Sign in with Google** (Supabase Auth). Each user's chats are private, enforced by the database (Row Level Security).
- **Personalization.** Each user saves preferences on the Settings page; the agent uses them to rank and filter.
- **Four agent tools.** `search_swaps` and `check_health` (the catalog and GitHub), `web_search` (OpenAI's built-in search) and `send_to_discord` (only when the user asks).
- **Streaming answers** with tool step cards and source links, and delete for old chats.

## Setup

You need an OpenAI key, a Supabase project, a Google OAuth client and (optionally) a Discord webhook.

1. **Supabase.** Create a project. Open the SQL editor and run `supabase/schema.sql`.
2. **Google.** In Google Cloud, go to Google Auth Platform, then Clients, and create a **Web application** client.
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Scopes: `openid`, `userinfo.email`, `userinfo.profile`
3. **Supabase dashboard.** Auth, Providers, Google: turn it on and paste the Client ID and Secret. Auth, URL Configuration: set the Site URL to `http://localhost:3000` and add the redirect URL `http://localhost:3000/auth/callback`.
4. **Discord (optional).** Channel settings, Integrations, Webhooks, New webhook. Copy the URL.
5. **Env.** Copy `.env.example` to `.env.local` and fill it in. The Supabase URL and publishable key are on the project's API settings page.
6. `AI_MODEL` must be a model that supports OpenAI's built-in web search.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests (no network, no keys needed)
npm run lint
npm run build
```

## Where things live

| Folder | What it holds |
|---|---|
| `app/` | Pages (`/`, `/login`, `/settings`) and routes (`/api/*`, `/auth/*`) |
| `proxy.ts`, `lib/supabase/` | Keeps the login cookie fresh and sends signed-out visitors to `/login` |
| `lib/agent/` | The agent loop, prompts and tool schemas |
| `lib/store/` | Data and outside APIs: conversations, profiles (Supabase), GitHub, Discord, the catalog |
| `components/` | The chat, sign-in and settings screens |
| `supabase/schema.sql` | The two tables and their Row Level Security policies |
