export default function ToolBadge({ toolName, args, isDone }) {
  return (
    <div className="flex flex-col gap-2 my-2 py-2 px-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 font-mono">
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        {!isDone ? (
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-500"></span>
          </div>
        ) : (
          <div className="flex h-3 w-3 items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        )}
        
        {/* Tool Name */}
        <span className="font-semibold text-zinc-800 dark:text-zinc-200 tracking-tight">
          {toolName}
        </span>
      </div>

      {/* Loading Animation (ChatGPT style glowing line) */}
      {!isDone && (
        <div className="relative w-full h-[2px] bg-zinc-200 dark:bg-zinc-800 overflow-hidden rounded-full mt-1">
          <div className="absolute top-0 left-0 h-full w-1/3 bg-zinc-500 rounded-full animate-[translateX_1.5s_ease-in-out_infinite]"></div>
          <style jsx>{`
            @keyframes translateX {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
