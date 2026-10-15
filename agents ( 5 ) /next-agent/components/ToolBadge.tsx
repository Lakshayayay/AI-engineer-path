import { Check } from "lucide-react";

type ToolBadgeProps = {
  toolName: string;
  isDone: boolean;
};

/** Shows one tool call: a pulsing dot and sliding bar while it runs, a checkmark when finished. */
export default function ToolBadge({ toolName, isDone }: ToolBadgeProps) {
  return (
    <div className="flex flex-col gap-2 my-2 py-2 px-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 font-mono">
      <div className="flex items-center gap-3">
        {isDone ? (
          <Check size={12} strokeWidth={3} className="text-zinc-500" />
        ) : (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-500" />
          </span>
        )}
        <span className="font-semibold text-zinc-800 dark:text-zinc-200 tracking-tight">{toolName}</span>
      </div>

      {/* `slide` keyframes are defined in globals.css */}
      {!isDone && (
        <div className="relative w-full h-[2px] bg-zinc-200 dark:bg-zinc-800 overflow-hidden rounded-full mt-1">
          <div className="absolute top-0 left-0 h-full w-1/3 bg-zinc-500 rounded-full animate-[slide_1.5s_ease-in-out_infinite]" />
        </div>
      )}
    </div>
  );
}
