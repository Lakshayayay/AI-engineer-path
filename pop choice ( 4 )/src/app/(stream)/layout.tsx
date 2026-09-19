import Link from "next/link";

export const metadata = {
  title: "PopStream",
  description: "Browse movies, watch free classics, and find where to stream everything else.",
};

export default function StreamLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#0b0d17] text-white font-roboto-slab flex flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-4 px-4 md:px-10 py-3 bg-[#0b0d17]/90 backdrop-blur border-b border-white/10">
        <Link href="/browse" className="text-[#51e08a] text-2xl font-carter-one">PopStream</Link>
        <Link href="/browse" className="text-sm text-white/80 hover:text-white hidden sm:inline">Browse</Link>
        <Link href="/" className="text-sm text-white/80 hover:text-white hidden sm:inline">Ask PopChoice</Link>
        {/* Native GET form: search works with zero client JS */}
        <form action="/browse" className="ml-auto flex-1 max-w-sm">
          <input
            name="q"
            type="search"
            placeholder="Describe a movie, or type a name…"
            className="w-full rounded-md bg-white/10 px-3 py-2 text-sm placeholder:text-white/50 outline-none focus:ring-2 focus:ring-[#51e08a]"
          />
        </form>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="px-4 md:px-10 py-6 text-xs text-white/50 border-t border-white/10">
        Plots from Wikipedia (CC BY-SA). Facts and posters from OMDb (CC BY-NC). Free films from the Internet Archive.
        Where-to-watch data from Watchmode. PopStream is a non-commercial learning project.
      </footer>
    </div>
  );
}
