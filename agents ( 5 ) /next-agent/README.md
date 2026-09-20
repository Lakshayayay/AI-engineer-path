# Next Agent

A chat agent built with Next.js. The model can call tools (weather, location, calculator, Wikipedia) and loop until it has an answer.

## Run

```bash
cp .env.local.example .env.local   # add your GROQ_API_KEY
npm install
npm run dev                        # http://localhost:3000
```

## Concepts covered

| Concept | Where |
|---|---|
| **Streaming chat**: tokens render as they arrive instead of after the full reply | `app/api/chat/route.js` (`streamText`), `app/page.jsx` (`useChat`) |
| **Tool calling**: the model asks for a function to run, the server runs it and returns the result | `lib/tools.js` |
| **Agent loop**: multi-step tool calls until done (`maxSteps: 5`), e.g. location, then weather | `route.js` |
| **Schema-validated tool inputs** with Zod, so the model's arguments are checked | `lib/tools.js` |
| **Graceful tool failure**: errors return to the model as data instead of crashing the loop | `executeTool` wrapper in `lib/tools.js` |
| **System prompt**: rules for when to use tools and how to format replies | `route.js` |
| **Provider swap**: Groq exposes an OpenAI-compatible API, so only `baseURL` and key change | `route.js` (`createOpenAI`) |
| **Tool UI**: show running/finished tool calls in the chat | `components/ToolBadge.jsx`, `ChatMessage.jsx` |

## Libraries

| Library | Used for |
|---|---|
| `next` (14, App Router) | Frontend and the `/api/chat` server route |
| `react` / `react-dom` | UI |
| `ai` (Vercel AI SDK v4) | `streamText`, `tool`, streaming protocol |
| `@ai-sdk/react` (v1) | `useChat` hook (state, submit, streaming) |
| `@ai-sdk/openai` (v1) | OpenAI-compatible provider, pointed at Groq |
| `zod` (v3) | Tool parameter schemas |
| `react-markdown` | Render markdown replies |
| `tailwindcss`, `lucide-react` | Styling and icons |

## Notes

- **Groq is not Grok.** Groq is an inference host that runs open models. The default here is `openai/gpt-oss-120b` (OpenAI's open-weight model). Grok is xAI's model and uses a different API.
- `ai`, `@ai-sdk/*` and `zod` are pinned to v4-era majors. The code uses that API (`toDataStreamResponse`, `maxSteps`, `parameters`); v7 renamed these.
- `calculateMath` uses `eval` behind a regex filter. Demo only; replace it with a real expression parser before production.
- The weather tool uses a Scrimba-hosted OpenWeatherMap proxy and may stop working.
