"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { readErrorMessage } from "./api-client";
import { Composer } from "./composer";
import { MessageList } from "./message-list";
import { buildPrompt } from "./prompt-format";
import { StarterSwaps } from "./starter-swaps";

// The server keeps the model context, so each request carries only the chat id and the new text.
const transport = new DefaultChatTransport({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ id, messages }) => ({
    body: { conversationId: id, userPrompt: getText(messages.at(-1)) },
  }),
});

const STATUS_LABELS: Record<string, string> = {
  "tool-search_swaps": "Searching the catalog...",
  "tool-check_health": "Checking project health...",
};

interface ChatSessionProps {
  chatId: string;
  initialMessages: UIMessage[];
  starterSwapNames: string[];
  onBusyChange: (isBusy: boolean) => void;
  onTurnFinished: () => void;
}

// One chat on screen: its transcript, starter chips and input. A new chat id remounts it from scratch.
export function ChatSession({
  chatId,
  initialMessages,
  starterSwapNames,
  onBusyChange,
  onTurnFinished,
}: ChatSessionProps) {
  const [input, setInput] = useState("");
  const [selectedSwapNames, setSelectedSwapNames] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The transcript as it was before the last send, so a failed turn can be taken back off the screen.
  const messagesBeforeSend = useRef<UIMessage[]>(initialMessages);

  const { messages, setMessages, sendMessage, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    onFinish: onTurnFinished,
    onError: (error) => {
      // The failed message was never saved, so take it back off the screen.
      setMessages(messagesBeforeSend.current);
      setErrorMessage(readErrorMessage(error));
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
  const isFollowUp = messages.length > 0;
  const canSubmit = !isBusy && (input.trim().length > 0 || selectedSwapNames.length > 0);

  // Tell the page when a request is in flight, so it can lock the chat list.
  useEffect(() => onBusyChange(isBusy), [isBusy, onBusyChange]);

  function submit() {
    const prompt = buildPrompt(input, selectedSwapNames);
    if (!prompt || isBusy) return;

    messagesBeforeSend.current = messages;
    setErrorMessage(null);
    setInput("");
    setSelectedSwapNames([]);
    void sendMessage({ text: prompt });
  }

  // Clicking a chip acts like a toggle: add it if missing, remove it if selected.
  function toggleSwap(swapName: string) {
    setSelectedSwapNames((current) =>
      current.includes(swapName) ? current.filter((name) => name !== swapName) : [...current, swapName],
    );
  }

  return (
    <section className="search-flow">
      {/* Chips are for a fresh chat; a follow-up just continues the conversation. */}
      {!isFollowUp && (
        <StarterSwaps swapNames={starterSwapNames} selectedSwapNames={selectedSwapNames} onToggle={toggleSwap} />
      )}

      <MessageList
        messages={messages}
        isLoading={isBusy}
        loadingLabel={getLoadingLabel(messages)}
        errorMessage={errorMessage}
      />

      {/* The input hides while a request is in flight, like a sent message. */}
      {!isBusy && (
        <Composer
          input={input}
          label={isFollowUp ? "Ask a follow-up:" : "Write down any other tools or specific requirements:"}
          placeholder={
            isFollowUp
              ? "Ask about tradeoffs, maintenance, hosting, or next steps..."
              : "E.g. 'I need an email marketing tool for my university club.'"
          }
          submitLabel={getSubmitLabel(isFollowUp, selectedSwapNames.length)}
          canSubmit={canSubmit}
          onInputChange={setInput}
          onSubmit={submit}
        />
      )}
    </section>
  );
}

// Match the button label to the mode and the current chip selection.
function getSubmitLabel(isFollowUp: boolean, selectedCount: number): string {
  if (isFollowUp) return "Send";
  return selectedCount > 1 ? "Swap 'em" : "Swap it";
}

// While a tool runs, say which one. Otherwise keep the plain label.
function getLoadingLabel(messages: UIMessage[]): string {
  const lastMessage = messages.at(-1);
  const lastPart = lastMessage?.role === "assistant" ? lastMessage.parts.at(-1) : undefined;

  return (lastPart && STATUS_LABELS[lastPart.type]) ?? "Loading...";
}

function getText(message: UIMessage | undefined): string {
  return message?.parts.map((part) => (part.type === "text" ? part.text : "")).join("") ?? "";
}
