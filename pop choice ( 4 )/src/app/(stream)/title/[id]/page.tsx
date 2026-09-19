import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getMovie, similarMovies } from "@/lib/movies";
import { getWatchInfo, type WatchSource } from "@/lib/watchmode";
import { PosterRow } from "../../_components/PosterRow";

const GROUPS: { type: WatchSource["type"]; label: string }[] = [
  { type: "sub", label: "Subscription" },
  { type: "free", label: "Free" },
  { type: "rent", label: "Rent" },
  { type: "buy", label: "Buy" },
];

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = Number((await params).id);
  const movie = Number.isInteger(id) ? await getMovie(id) : null;
  if (!movie) notFound();

  const [watch, similar] = await Promise.all([getWatchInfo(movie.id, movie.imdbId), similarMovies(movie.id)]);

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6 px-4 md:px-10 py-6">
        <div className="relative w-[200px] aspect-[2/3] shrink-0 rounded-md overflow-hidden bg-white/5 self-center md:self-start">
          <Image src={movie.posterUrl ?? "https://placehold.co/300x450/0b0d17/FFFFFF?text=No+Poster"} alt={`${movie.title} poster`} fill className="object-cover" unoptimized />
        </div>

        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold">{movie.title} <span className="text-white/40 font-normal">({movie.year})</span></h1>
          <p className="mt-1 text-sm text-white/60">
            {[movie.rated, movie.runtimeMin && `${movie.runtimeMin} min`, movie.rating && `IMDb ${movie.rating}`, movie.genres.join(", ")].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-4 text-white/90 leading-relaxed">{movie.overview}</p>
          {movie.director && <p className="mt-3 text-sm"><span className="text-white/50">Director:</span> {movie.director}</p>}
          {movie.cast.length > 0 && <p className="text-sm"><span className="text-white/50">Starring:</span> {movie.cast.join(", ")}</p>}

          {movie.archiveId && (
            <Link href={`/watch/${movie.id}`} className="mt-5 inline-block rounded-md bg-[#51e08a] px-6 py-3 font-bold text-[#000c36]">
              ▶ Play free
            </Link>
          )}
          {movie.wikiUrl && (
            <a href={movie.wikiUrl} target="_blank" rel="noreferrer" className="mt-5 ml-3 inline-block text-sm text-white/60 underline">
              Plot on Wikipedia
            </a>
          )}
        </div>
      </div>

      <section className="px-4 md:px-10 py-3">
        <h2 className="mb-2 text-lg font-bold">Where to watch</h2>
        {watch.sources.length === 0 ? (
          <p className="text-sm text-white/50">No streaming information available for your region.</p>
        ) : (
          GROUPS.map(({ type, label }) => {
            const list = watch.sources.filter((s) => s.type === type);
            if (!list.length) return null;
            return (
              <div key={type} className="mb-2 flex flex-wrap items-center gap-2">
                <span className="w-28 text-xs uppercase tracking-wide text-white/50">{label}</span>
                {list.map((s) => (
                  <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
                    {s.name}{s.price ? ` · $${s.price}` : ""}
                  </a>
                ))}
              </div>
            );
          })
        )}
      </section>

      {watch.trailerUrl && (
        <section className="px-4 md:px-10 py-3">
          <h2 className="mb-2 text-lg font-bold">Trailer</h2>
          <iframe src={watch.trailerUrl} title={`${movie.title} trailer`} allowFullScreen className="w-full max-w-2xl aspect-video rounded-md" />
        </section>
      )}

      <PosterRow title="More like this" movies={similar} />
    </>
  );
}
