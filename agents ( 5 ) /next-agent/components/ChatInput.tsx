import type { FormEvent, KeyboardEvent } from "react";
import { CornerDownLeft } from "lucide-react";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
};

/** The message box. Enter sends, Shift+Enter adds a new line. */
export default function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  const canSend = value.trim() !== "" && !isLoading;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault(); // stop Enter from inserting a new line
    if (canSend) event.currentTarget.form?.requestSubmit(); // runs the form's onSubmit
  };

  return (
    <div className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-[#09090b] dark:via-[#09090b] dark:to-transparent pt-10 pb-6 px-4">
      <form
        onSubmit={onSubmit}
        className="max-w-3xl mx-auto relative flex items-end rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
      >
        {/* Not disabled while loading: a disabled field drops focus, and you'd have to click it again. */}
        <textarea
          name="user-input"
          placeholder="Instruct the agent..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={1}
          className="flex-1 max-h-32 min-h-[44px] px-4 py-3 bg-transparent border-none focus:outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 w-full resize-none leading-relaxed"
        />
        <div className="p-2 shrink-0">
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className="p-1.5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <CornerDownLeft size={16} strokeWidth={2.5} />
          </button>
        </div>
      </form>
      <p className="max-w-3xl mx-auto text-center mt-3 text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        Shift + Enter for new line
      </p>
    </div>
  );
}
