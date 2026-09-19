import Image from "next/image";
import Link from "next/link";
import { REPO_URL } from "./_components/constants";
import { OpenSearch, SearchDialog } from "./_components/SearchDialog";
import { TabBar } from "./_components/TabBar";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#free", label: "Free films" },
  { href: "/#genres", label: "Genres" },
  { href: "/popchoice", label: "Group quiz" },
  { href: "/you", label: "Your taste" },
];

export default function StreamLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-night text-white">
      <header className="sticky top-0 z-20 flex items-center gap-6 border-b border-white/10 bg-deep/95 px-4 py-2.5 backdrop-blur md:px-10">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={30} height={33} priority />
          <span className="font-carter-one text-2xl">PopStream</span>
        </Link>
        <nav aria-label="Primary" className="hidden gap-5 text-sm text-white/80 md:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-white">{n.label}</Link>)}
        </nav>
        <OpenSearch className="ml-auto flex items-center gap-2 rounded-md bg-slate px-3 py-1.5 text-sm hover:brightness-125">
          <span aria-hidden>⌕</span><span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded bg-deep px-1.5 text-xs text-white/70 md:inline">/</kbd>
        </OpenSearch>
      </header>
      <SearchDialog />

      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      <footer className="border-t border-white/10 bg-deep px-4 py-6 text-xs leading-relaxed text-white/60 md:px-10">
        <p>
          Plots from Wikipedia (CC BY-SA). Cast, crew and studios from Wikidata (CC0). Facts and posters from OMDb (CC BY-NC).
          Free films from the Internet Archive. PopStream is a non-commercial learning project.
        </p>
        <p className="mt-2"><a href={REPO_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-white">Source on GitHub</a></p>
      </footer>
      <TabBar />
    </div>
  );
}
