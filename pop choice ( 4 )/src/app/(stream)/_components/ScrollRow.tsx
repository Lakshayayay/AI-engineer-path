"use client";

import { useRef } from "react";

// Horizontal scroller. Touch devices use native scroll-snap; desktop gets arrow buttons.
export function ScrollRow({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  const arrow = "absolute top-1/2 z-10 hidden h-12 w-9 -translate-y-1/2 items-center justify-center rounded bg-deep/90 text-xl md:flex md:opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100";
  return (
    <div className="group/row relative">
      <div ref={ref} role="list" aria-label={label} className="flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:px-10 [scrollbar-width:none]">
        {children}
      </div>
      <button type="button" aria-label={`Scroll ${label} left`} onClick={() => scroll(-1)} className={`${arrow} left-1`}>‹</button>
      <button type="button" aria-label={`Scroll ${label} right`} onClick={() => scroll(1)} className={`${arrow} right-1`}>›</button>
    </div>
  );
}
