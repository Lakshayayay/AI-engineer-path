# Notes: OpenAI Responses and Chat Completions in the Vercel AI SDK

**Type:** Concept notes (no planning). **Saved:** 2026-10-15.
**Why this exists:** I'm studying the OpenAI lecture (Responses API, Chat Completions API). My main SDK is the Vercel AI SDK. These notes translate one into the other. Next step: share the lecture code and translate it.

---

## 1. The big idea

The Vercel AI SDK has no APIs of its own. It is a client library that calls OpenAI's APIs.
**The functions stay the same. The model you pass in picks which OpenAI API is used.**

| OpenAI API | AI SDK model call | Notes |
|---|---|---|
| **Responses API** | `openai("model")` or `openai.responses("model")` | Default since AI SDK 5 |
| **Chat Completions API** | `openai.chat("model")` | For hosts that support Chat Completions but not Responses |
| Legacy Completions | `openai.completion("gpt-3.5-turbo-instruct")` | Only that one model is supported |

```ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

streamText({ model: openai("gpt-..."), messages, tools });      // Responses
streamText({ model: openai.chat("gpt-..."), messages, tools }); // Chat Completions
```

---

## 2. Chat and response functions

**Core (server)**

| Function | Does |
|---|---|
| `generateText` | Runs the model, waits, returns the whole result |
| `streamText` | Runs the model and streams the result live |

Both take `model`, `messages` (or `prompt`), `tools`, `stopWhen` (loop limit), `output` (structured output) and `instructions` (the system prompt).

**Response functions (on the `streamText` result)**

| Function | Returns |
|---|---|
| `toUIMessageStreamResponse()` | An HTTP `Response` that `useChat` understands (text, tool calls, errors). Normal chat. |
| `toTextStreamResponse()` | A `Response` with text only |
| `pipeUIMessageStreamToResponse(res)` / `pipeTextStreamToResponse(res)` | The same, written to a Node.js `res` |

Read-it-yourself versions: `textStream`, `stream` (all events), and promises like `text`, `steps`, `usage`, `toolCalls`, `output`.

**Client**

| Name | Does |
|---|---|
| `useChat` | Runs the chat: `messages`, `sendMessage`, `status`, `stop`, `regenerate`, `addToolOutput`, `addToolApprovalResponse` |
| `useCompletion`, `useObject` | Single-prompt completion UI; streamed JSON object |
| `convertToModelMessages` | Converts `useChat` messages to model messages |

---

## 3. `tool()` and the two kinds of tools

`tool({ description, parameters, execute })` defines **your own function** that the model can call. The model never runs your code: it asks for a call, the SDK validates the arguments against the schema, runs `execute` on your server, and sends the result back. It works the same with both OpenAI APIs and with other providers.

| | Your tool (`tool()`) | OpenAI built-in (`openai.tools.*`) |
|---|---|---|
| Who runs it | Your server (`execute`) | OpenAI's side (the docs' examples show no `execute`) |
| Works with | Any provider | OpenAI Responses only |

---

## 4. Built-in tools (Responses API)

Condensed from the docs. I saw fragments only, so check option names when building.

```ts
const result = streamText({
  model: openai("gpt-..."),
  messages,
  tools: {
    web_search: openai.tools.webSearch({ searchContextSize: "high" }),
    file_search: openai.tools.fileSearch({ vectorStoreIds: ["vs_123"] }),
    getLocation: tool({ description: "...", parameters: z.object({}), execute: async () => ({ /* ... */ }) }),
  },
});
```

| Tool | Call | Key options |
|---|---|---|
| Web search | `openai.tools.webSearch({...})` | `searchContextSize`, `userLocation`, `filters` (allowed/blocked domains) |
| File search | `openai.tools.fileSearch({...})` | `vectorStoreIds` (required), `maxNumResults` |
| Code interpreter | `openai.tools.codeInterpreter()` | `container` |
| MCP | `openai.tools.mcp({...})` | `serverLabel` plus `serverUrl`; `requireApproval` |

Results: `result.sources` (URLs) and citations on the text parts. For file search, `providerOptions: { openai: { include: ["file_search_call.results"] } }` returns the matched chunks.
MCP warning from the docs: if `requireApproval` is unset, tool calls are approved by default, so connect only to trusted servers.

**Other Responses-only options** (via `providerOptions.openai`): `previousResponseId` or `conversation` (state kept on OpenAI's side), `reasoningSummary`, `store`.

---

## 5. Translating a lecture snippet

This is my mapping. Verify it as you build.

| OpenAI Responses (lecture) | Vercel AI SDK |
|---|---|
| `responses.create({ model, input })` | `generateText({ model: openai(...), messages })` |
| `stream: true` | `streamText(...)` |
| `tools: [{ type: "web_search" }]` | `tools: { web_search: openai.tools.webSearch() }` |
| `tools: [{ type: "file_search", vector_store_ids }]` | `openai.tools.fileSearch({ vectorStoreIds })` |
| `tools: [{ type: "function", ... }]` | `tool({ description, parameters, execute })` |
| `previous_response_id` | `providerOptions.openai.previousResponseId` |
| `response.output_text` | `result.text` |

---

## 6. Gotchas

- **Default flipped in v5:** `openai("model")` used Chat Completions in v4 and uses Responses from v5. Our `next-agent` (v4) calls Groq through `groq.chat(...)`. Keep `.chat()` for Groq after upgrading.
- **Built-in tools need OpenAI Responses.** On Groq, write your own search tool instead.
- **Renames since v4** (our `next-agent` is still on v4): `toDataStreamResponse` is now `toUIMessageStreamResponse`; `maxSteps` is now `stopWhen`; `parameters` is now `inputSchema`; `getErrorMessage` is now `onError`; `system` is now `instructions`. `useChat` no longer returns `input`, `handleSubmit` or `isLoading`: use your own input state, `sendMessage({ text })` and `status`.
- **Third-party OpenAI-compatible hosts:** the docs offer `createOpenAICompatible` from `@ai-sdk/openai-compatible`. I couldn't confirm Groq setup from that page.

---

## 7. Not verified

- How the MCP built-in tool returns results to your app.
- Whether `generateObject` and `streamObject` still exist in v7 (the docs show structured output as `result.output` from `generateText`).
- Whether Groq supports the Responses API.
- Exact model IDs for your account.

---

## Sources

- [AI SDK OpenAI provider docs](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- [AI SDK: generating text](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [`streamText` reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK UI reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui) and [`useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [OpenAI-compatible providers](https://ai-sdk.dev/providers/openai-compatible-providers)
- [AI SDK 5 migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)
