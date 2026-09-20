import ReactMarkdown from 'react-markdown';
import ToolBadge from './ToolBadge';

export default function ChatMessage({ message }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex w-full ${isAssistant ? "justify-start" : "justify-end"} mb-6`}>
      <div className={`flex flex-col max-w-[85%] ${isAssistant ? "items-start" : "items-end"}`}>
        <div 
          className={`px-4 py-3 rounded-2xl ${
            isAssistant 
              ? "bg-transparent text-zinc-800 dark:text-zinc-200" 
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-br-sm"
          }`}
        >
          {/* Render tools if any */}
          {message.toolInvocations?.length > 0 && (
            <div className="flex flex-col gap-1 mb-2">
              {message.toolInvocations.map((tool) => (
                <ToolBadge 
                  key={tool.toolCallId}
                  toolName={tool.toolName}
                  args={tool.args}
                  isDone={tool.state === "result"}
                />
              ))}
            </div>
          )}

          {/* Render Markdown Content */}
          {message.content && (
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
