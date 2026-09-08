# 🌙 DreamCatcher

> A personal AI-powered dream journal. Write down your dream, get a thoughtful interpretation back — powered by Google Gemini or OpenAI.

---

## What Is This?

DreamCatcher is a **full-stack web app** built as a hands-on deployment learning project. It lets you log your dreams through a clean browser UI, sends them to an AI model for psychological/symbolic interpretation, and stores everything in a local SQLite database.

The app is intentionally simple — no frameworks, no cloud databases, no CI pipelines. Just Node.js, a flat file database, and two AI APIs wired up so you can swap between them with a single line change.

---

## Features

| Feature | Details |
|---|---|
| 📝 **Dream Journal** | Write and save dreams with timestamps |
| 🤖 **AI Interpretation** | Powered by Gemini (`gemini-2.5-flash`) or OpenAI (`gpt-4o-mini`) |
| 🔄 **Dual AI Support** | Swap between Gemini and OpenAI via a single import change |
| 📖 **Read More Toggle** | Long interpretations are collapsed; expand on demand |
| 🗑️ **Delete Dreams** | Remove any entry from your journal |
| 🛡️ **Input Validation** | Trims whitespace, checks for empty input, caps at 5,000 chars |
| 🔒 **Security Headers** | Helmet.js applied in production for safe HTTP headers |
| 🧼 **XSS Protection** | Frontend sanitizes all user-generated text before rendering |

---

## Tech Stack

```
Frontend        →  Vanilla HTML + CSS + JavaScript (no framework)
Backend         →  Node.js + Express.js (ESM modules)
Database        →  SQLite3 (single file: dreams.db)
AI — Primary    →  Google Gemini via @google/generative-ai SDK
AI — Fallback   →  OpenAI via openai SDK
Security        →  Helmet.js (production only)
Font            →  Roboto via Google Fonts
```

---

## Project Structure

```
learning depoloyment (2)/
├── config/
│   ├── database.js          # SQLite singleton connection manager
│   └── database-init.js     # Creates the dreams table on boot
├── public/                  # Served as static files
│   ├── index.html           # Main UI shell
│   ├── app.js               # Client-side logic (fetch, render, delete)
│   ├── styles.css           # All styling
│   └── dream-logo.png       # Brand logo
├── routes/
│   └── dreams.js            # REST API endpoints (GET / POST / DELETE)
├── utils/
│   ├── ai-gemini.js         # Gemini API integration
│   ├── ai-openai.js         # OpenAI API integration
│   └── validateText.js      # Input sanitisation & length guard
├── server.js                # Express app entry point
├── package.json
├── .env.example             # Template for environment variables
└── dreams.db                # SQLite database file (auto-created)
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dreams` | Returns all dreams, newest first |
| `GET` | `/api/dreams/:id` | Returns a single dream by ID |
| `POST` | `/api/dreams` | Submits a dream, triggers AI interpretation, saves to DB |
| `DELETE` | `/api/dreams/:id` | Deletes a dream by ID |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Lakshayayay/AI-engineer-path.git
cd "learning depoloyment (2)"
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your API key:

```env
PORT=3001
NODE_ENV=development

# Pick one: Gemini or OpenAI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_MODEL=gpt-4o-mini
```

### 3. Switch AI provider (optional)

Open `routes/dreams.js` and change line 3:

```js
// Gemini (default)
import { getDreamInterpretation } from '../utils/ai-gemini.js';

// OR OpenAI
import { getDreamInterpretation } from '../utils/ai-openai.js';
```

### 4. Run locally

```bash
npm run dev     # development — auto-restarts on file changes
npm start       # production
```

Open `http://localhost:3001` in your browser.

---

## Deployment

### What the app needs to run

- Node.js 18+
- One AI API key (Gemini or OpenAI)
- A server with a **persistent filesystem** (for `dreams.db`)

### Works on

- Any VPS (DigitalOcean, Hetzner, Linode) with persistent disk
- Railway (with a volume mount)
- Render (with a disk add-on)
- Self-hosted (bare metal or Docker with a bind-mounted volume)

### Does NOT work on

| Platform | Why |
|---|---|
| **Vercel / Netlify** | Serverless — no persistent filesystem; SQLite file is wiped on every cold start |
| **Heroku (free tier)** | Ephemeral filesystem — database resets on every dyno restart |
| **AWS Lambda** | Stateless execution — SQLite has no home |
| **Any serverless FaaS** | Same reason — SQLite needs a stable file path between requests |

> **Bottom line**: SQLite = you need a long-running server process with a disk that persists between restarts. If you want serverless, replace SQLite with a managed database like PostgreSQL (Supabase, Neon, PlanetScale).

### Recommended: deploy to Railway

```bash
# 1. Push to GitHub (already done)
# 2. Go to railway.app → New Project → Deploy from GitHub repo
# 3. Set environment variables in Railway dashboard
# 4. Add a Volume and mount it at /app (so dreams.db persists)
# 5. Deploy — Railway auto-detects Node.js and runs npm start
```

---

## What This Project Has vs. What It Doesn't

### Has

- Full REST API with correct HTTP status codes
- Dual AI provider support with a single-line toggle
- Input validation + XSS sanitisation
- Security headers (Helmet) in production
- Singleton SQLite connection pattern
- Clean, responsive UI with loading states and error handling
- Database auto-initialised on first boot

### Doesn't Have

- User authentication / accounts
- HTTPS (you'd add a reverse proxy like Nginx or Caddy for that)
- Rate limiting on the API
- Pagination (all dreams load at once)
- Search or filtering
- CI/CD pipeline
- Containerisation (no Dockerfile)
- Tests (unit or integration)
- Production-grade database (PostgreSQL / MySQL)

---

## Deployment Pipeline Summary

This project has **no automated deployment pipeline** — it's a learning project meant to teach the fundamentals of shipping code to a server manually.

The mental model for deploying this app:

```
Local Dev  →  Git Push  →  GitHub  →  Manual Deploy to Server
                                            ↓
                                   npm install + npm start
                                   (or a process manager like PM2)
```

There is no:
- Docker image / container registry
- GitHub Actions or CI runner
- Staging environment
- Blue-green / canary deployment
- Health checks or auto-restart (beyond PM2)

This is intentional. The goal was to learn what deployment *is* before adding automation on top of it.

---

## Learning Notes

This project lives inside the `AI engineer path` repository as a progression checkpoint. The `reverse-engineering.md` file inside this directory goes deep on every design decision — why SQLite, why dual AI providers, why Helmet only in production, and what the critical bug fix was in `public/app.js`.

If you want to go further:
- Swap SQLite → PostgreSQL (Supabase free tier is easy)
- Add a Dockerfile
- Wire up a GitHub Actions deploy workflow
- Add rate limiting with `express-rate-limit`

---

*Built as part of an AI engineering learning path. Not production-ready — intentionally.*