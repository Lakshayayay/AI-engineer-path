import Image from "next/image";
import Link from "next/link";
import { GENRES, type Movie } from "@/lib/movies";
import { AskForm } from "./AskForm";
import { TRY_QUERIES } from "./constants";

export const pill = "rounded-full bg-slate px-3 py-1 text-xs";

export function Hero({ movie, forYou }: { movie: Movie; forYou: boolean }) {
  return (
    <section className="relative overflow-hidden bg-deep">
      {movie.posterUrl && <Image src={movie.posterUrl} alt="" fill sizes="100vw" className="scale-110 object-cover opacity-30 blur-2xl" unoptimized priority />}
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-transparent" />
      <div className="relative flex flex-col gap-6 px-4 py-8 md:flex-row md:items-end md:px-10 md:py-12">
        <div className="relative aspect-[2/3] w-[150px] shrink-0 overflow-hidden rounded-lg bg-slate/40 shadow-2xl md:w-[200px]">
          <Image src={movie.posterUrl ?? "https://placehold.co/300x450/00072a/FFFFFF?text=No+Poster"} alt={`${movie.title} poster`} fill sizes="200px" className="object-cover" unoptimized priority />
        </div>
        <div className="max-w-2xl">
          <p className="text-sm font-bold text-butter">{forYou ? "Top pick for you" : "Featured free classic"}</p>
          <h1 className="font-carter-one mt-1 text-4xl md:text-5xl">{movie.title} <span className="text-white/60">({movie.year})</span></h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {movie.archiveId && <span className="rounded-full bg-butter px-3 py-1 text-xs font-bold text-night">Free to watch</span>}
            {movie.genres.slice(0, 2).map((g) => <span key={g} className={pill}>{g}</span>)}
            {movie.runtimeMin && <span className={pill}>{movie.runtimeMin} min</span>}
            {movie.rating && <span className={`${pill} text-butter`}>★ {movie.rating}</span>}
          </div>
          <p className="mt-4 line-clamp-3 text-white/90">{movie.overview}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {movie.archiveId && <Link href={`/watch/${movie.id}`} className="rounded-md bg-pop px-5 py-2.5 font-bold text-night hover:brightness-110">Play free</Link>}
            <Link href={`/title/${movie.id}`} className="rounded-md bg-white/10 px-5 py-2.5 font-bold hover:bg-white/20">Details</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// The one bold element: the Ask bar with the popcorn mascot.
export function AskBar({ recent }: { recent: string[] }) {
  return (
    <section className="mx-4 my-6 rounded-2xl bg-deep p-5 ring-1 ring-white/10 md:mx-10 md:p-7" aria-labelledby="ask-title">
      <div className="flex items-center gap-4">
        <Image src="/logo.png" alt="" width={56} height={61} />
        <h2 id="ask-title" className="font-carter-one text-2xl md:text-3xl">What do you feel like watching?</h2>
      </div>
      <div className="mt-4"><AskForm recent={recent} /></div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-white/60">Try</span>
        {TRY_QUERIES.map((t) => (
          <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className={`${pill} hover:brightness-125`}>{t}</Link>
        ))}
      </div>
    </section>
  );
}

export function QuizBanner() {
  return (
    <section className="mx-4 my-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate/50 p-5 md:mx-10">
      <div className="flex items-center gap-4">
        <Image src="/logo.png" alt="" width={44} height={48} />
        <p><span className="font-bold">Movie night with friends?</span> Everyone answers 4 questions and PopChoice picks one film for the group.</p>
      </div>
      <Link href="/popchoice" className="rounded-md bg-pop px-5 py-2.5 font-bold text-night hover:brightness-110">Start the group quiz</Link>
    </section>
  );
}

export function GenrePills({ active }: { active?: string }) {
  return (
    <section id="genres" className="scroll-mt-20 px-4 py-4 md:px-10">
      <h2 className="mb-3 text-lg font-bold">Browse by genre</h2>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <Link key={g} href={`/genre/${encodeURIComponent(g)}`} aria-current={g === active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm ${g === active ? "bg-pop font-bold text-night" : "bg-slate hover:brightness-125"}`}>
            {g}
          </Link>
        ))}
      </div>
    </section>
  );
}
