import ReactMarkdown from "react-markdown";
import type { Message } from "ai";
import ToolBadge from "./ToolBadge";

/**
 * Renders one chat message: user messages as a right-aligned bubble, assistant messages as plain text.
 *
 * A message is a list of `parts` (text, tool calls, ...) in the order they happened,
 * e.g. "Let me check." -> getLocation -> getCurrentWeather -> "It's 18°C in Paris."
 */
export default function ChatMessage({ message }: { message: Message }) {
  const isAssistant = message.role === "assistant";

  // Messages we create ourselves (like the welcome message) have no `parts`, only `content`.
  const parts: NonNullable<Message["parts"]> = message.parts ?? [{ type: "text", text: message.content }];

  return (
    <div className={`flex w-full mb-6 ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div className={`flex flex-col max-w-[85%] ${isAssistant ? "items-start" : "items-end"}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isAssistant
              ? "bg-transparent text-zinc-800 dark:text-zinc-200"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-br-sm"
          }`}
        >
          {parts.map((part, index) => {
            switch (part.type) {
              case "text":
                return part.text ? (
                  <div key={index} className="prose max-w-none text-sm leading-relaxed">
                    <ReactMarkdown>{part.text}</ReactMarkdown>
                  </div>
                ) : null;
              case "tool-invocation":
                return (
                  <ToolBadge
                    key={part.toolInvocation.toolCallId}
                    toolName={part.toolInvocation.toolName}
                    isDone={part.toolInvocation.state === "result"}
                  />
                );
              default:
                return null; // other part types (step markers, sources, files) aren't shown in this app
            }
          })}
        </div>
      </div>
    </div>
  );
}
