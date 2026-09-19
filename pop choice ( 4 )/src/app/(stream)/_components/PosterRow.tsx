import Image from "next/image";
import Link from "next/link";
import type { MovieCard } from "@/lib/movies";

const NO_POSTER = "https://placehold.co/300x450/0b0d17/FFFFFF?text=No+Poster";

export function PosterCard({ movie }: { movie: MovieCard }) {
  return (
    <Link href={`/title/${movie.id}`} className="group shrink-0 w-[140px] md:w-[170px] snap-start">
      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-white/5 ring-0 group-hover:ring-2 ring-[#51e08a] transition">
        <Image src={movie.posterUrl ?? NO_POSTER} alt={`${movie.title} poster`} fill sizes="170px" className="object-cover" unoptimized />
        {movie.archiveId && (
          <span className="absolute top-1 left-1 rounded bg-[#51e08a] px-1.5 py-0.5 text-[10px] font-bold text-[#000c36]">FREE</span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-white/80 line-clamp-2">
        {movie.title} {movie.year ? <span className="text-white/40">({movie.year})</span> : null}
      </p>
    </Link>
  );
}

export function PosterRow({ title, movies }: { title: string; movies: MovieCard[] }) {
  if (movies.length === 0) return null;
  return (
    <section className="px-4 md:px-10 py-3">
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      <div className="flex gap-3 overflow-x-auto snap-x pb-2">
        {movies.map((m) => <PosterCard key={m.id} movie={m} />)}
      </div>
    </section>
  );
}

export function PosterGrid({ movies }: { movies: MovieCard[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 px-4 md:px-10 py-4">
      {movies.map((m) => <PosterCard key={m.id} movie={m} />)}
    </div>
  );
}
