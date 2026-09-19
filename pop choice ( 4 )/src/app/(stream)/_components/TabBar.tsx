"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OpenSearch } from "./SearchDialog";

const tab = "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs";

// Mobile bottom navigation (the consumer-app pattern). Hidden from md up, where the header nav is used.
export function TabBar() {
  const path = usePathname();
  const cls = (active: boolean) => `${tab} ${active ? "text-pop" : "text-white/70"}`;
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-white/10 bg-deep md:hidden">
      <Link href="/" className={cls(path === "/")}><span aria-hidden className="text-lg">⌂</span>Home</Link>
      <OpenSearch className={cls(path.startsWith("/search"))}><span aria-hidden className="text-lg">⌕</span>Search</OpenSearch>
      <Link href="/popchoice" className={cls(false)}><span aria-hidden className="text-lg">◔</span>Quiz</Link>
      <Link href="/you" className={cls(path === "/you")}><span aria-hidden className="text-lg">☺</span>You</Link>
    </nav>
  );
}
