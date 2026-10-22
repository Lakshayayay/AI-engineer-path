import ReactMarkdown from "react-markdown";
import type { OpenSwapUIMessage } from "@/lib/types";
import { formatPromptForDisplay } from "./prompt-format";
import { getSources } from "./sources";
import { isToolPart } from "./tool-step-text";
import { ToolStep } from "./tool-steps";

interface MessageListProps {
  messages: OpenSwapUIMessage[];
  // The agent is working; shows the loader row below the transcript.
  isLoading: boolean;
  loadingLabel: string;
  errorMessage: string | null;
}

// The transcript: the user's lines, the agent's tool steps and Markdown answers, the loader and any error.
export function MessageList({ messages, isLoading, loadingLabel, errorMessage }: MessageListProps) {
  // With nothing to show yet, the starter screen is enough.
  if (messages.length === 0 && !isLoading && !errorMessage) return null;

  return (
    <section className="output-section output-shell visible">
      <div className="output-content" aria-live="polite">
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="history-turn user-turn">
              {formatPromptForDisplay(getText(message))}
            </div>
          ) : (
            <div key={message.id} className="history-turn assistant-turn">
              {message.parts.map((part, index) => {
                if (isToolPart(part)) return <ToolStep key={part.toolCallId} part={part} />;

                // react-markdown never renders raw HTML, so model output can't inject markup.
                return part.type === "text" ? (
                  <ReactMarkdown key={`text-${index}`} components={{ a: ExternalLink }}>
                    {part.text}
                  </ReactMarkdown>
                ) : null;
              })}
              <SourceList message={message} />
            </div>
          ),
        )}

        {isLoading && (
          <p className="loading-status">
            <span className="swap-loader" aria-hidden="true">
              <svg className="swap-loader-icon" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 8h10.5l-3-3M18 16H7.5l3 3"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>{loadingLabel}</span>
          </p>
        )}

        {/* Errors sit below the chat, so earlier messages stay visible. */}
        {errorMessage && <div className="history-turn error-turn">{errorMessage}</div>}
      </div>
    </section>
  );
}

// The web pages behind an answer. Only a live answer has them; a reopened chat is saved as plain text.
function SourceList({ message }: { message: OpenSwapUIMessage }) {
  const sources = getSources(message.parts);

  if (sources.length === 0) return null;

  return (
    <div className="sources">
      <h3>Sources</h3>
      <ul>
        {sources.map((source) => (
          <li key={source.url}>
            <ExternalLink href={source.url}>{source.label}</ExternalLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Model-written links open in a new tab and can't reach back into this page.
function ExternalLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function getText(message: OpenSwapUIMessage): string {
  return message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
}
