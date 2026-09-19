import Image from "next/image";
import Link from "next/link";
import type { MovieCard } from "@/lib/movies";
import type { SearchHit } from "@/lib/search";
import { ScrollRow } from "./ScrollRow";

const NO_POSTER = "https://placehold.co/300x450/00072a/FFFFFF?text=No+Poster";
const badge = "rounded bg-butter px-1.5 py-0.5 text-[11px] font-bold text-night";

export function PosterCard({ movie, forYou }: { movie: MovieCard; forYou?: boolean }) {
  return (
    <Link href={`/title/${movie.id}`} role="listitem" className="group w-[140px] shrink-0 snap-start md:w-[170px]">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-slate/40 transition-transform motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-visible:-translate-y-1">
        <Image src={movie.posterUrl ?? NO_POSTER} alt={`${movie.title} poster`} fill sizes="170px" className="object-cover" unoptimized />
        {movie.archiveId && <span className={`${badge} absolute left-1.5 top-1.5`}>Free</span>}
        {forYou && <span className={`${badge} absolute right-1.5 top-1.5`}>For you</span>}
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm text-white/90">
        {movie.title} {movie.year ? <span className="text-white/50">({movie.year})</span> : null}
      </p>
    </Link>
  );
}

export function RowHeading({ title, seeAll }: { title: React.ReactNode; seeAll?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-4 md:px-10">
      <h2 className="text-lg font-bold">{title}</h2>
      {seeAll && <Link href={seeAll} className="text-sm text-white/70 underline underline-offset-4 hover:text-white">See all</Link>}
    </div>
  );
}

export function PosterRow({ id, title, movies, seeAll, forYou }: {
  id?: string; title: React.ReactNode; movies: MovieCard[]; seeAll?: string; forYou?: boolean;
}) {
  if (movies.length === 0) return null;
  const label = typeof title === "string" ? title : "Films";
  return (
    <section id={id} className="scroll-mt-20 py-3">
      <RowHeading title={title} seeAll={seeAll} />
      <ScrollRow label={label}>
        {movies.map((m) => <PosterCard key={m.id} movie={m} forYou={forYou} />)}
      </ScrollRow>
    </section>
  );
}

export function PosterGrid({ movies }: { movies: MovieCard[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 px-4 py-4 md:px-10">
      {movies.map((m) => <PosterCard key={m.id} movie={m} />)}
    </div>
  );
}

// Big outlined numerals in Carter One, like a "Top 10" shelf.
export function Top10Row({ title, movies }: { title: string; movies: MovieCard[] }) {
  if (movies.length === 0) return null;
  return (
    <section className="py-3">
      <RowHeading title={title} />
      <ScrollRow label={title}>
        {movies.slice(0, 10).map((m, i) => (
          <div key={m.id} role="listitem" className="flex shrink-0 snap-start items-end">
            <span aria-hidden className="font-carter-one -mr-3 text-[110px] leading-[0.8] text-transparent [-webkit-text-stroke:3px_var(--color-slate)]">
              {i + 1}
            </span>
            <div className="relative z-[1] [&_a]:w-[120px] md:[&_a]:w-[140px]">
              <PosterCard movie={m} />
            </div>
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

// One search result: poster, title, a "why it matched" tag and the line that matched.
export function ResultCard({ hit }: { hit: SearchHit }) {
  return (
    <Link href={`/title/${hit.id}`} className="group flex gap-4 rounded-lg bg-deep p-3 hover:bg-slate/40">
      <div className="relative aspect-[2/3] w-[84px] shrink-0 overflow-hidden rounded bg-slate/40 md:w-[104px]">
        <Image src={hit.posterUrl ?? NO_POSTER} alt={`${hit.title} poster`} fill sizes="104px" className="object-cover" unoptimized />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold md:text-lg">{hit.title} <span className="font-normal text-white/50">({hit.year})</span></h3>
          {hit.archiveId && <span className={badge}>Free</span>}
          {hit.forYou && <span className={badge}>For you</span>}
        </div>
        <p className="mt-1 text-xs text-white/60">
          {[hit.genres.slice(0, 3).join(", "), hit.runtimeMin && `${hit.runtimeMin} min`, hit.rating && `★ ${hit.rating}`].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-2 inline-block rounded-full bg-slate px-2.5 py-0.5 text-xs font-bold">{hit.why.label}</p>
        {hit.why.snippet && <p className="mt-2 line-clamp-3 text-sm text-white/80">{hit.why.snippet}</p>}
      </div>
    </Link>
  );
}
