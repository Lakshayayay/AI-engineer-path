import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCredits, similarMovies, type Role } from "@/lib/movies";
import { getWatchInfo, type WatchSource } from "@/lib/watchmode";
import { getRating, getViewerId } from "@/lib/viewer";
import { movieById } from "../../_components/movie-cache";
import { PosterRow } from "../../_components/PosterRow";
import { pill } from "../../_components/Sections";
import { TasteButtons } from "../../_components/TasteButtons";

const GROUPS: { type: WatchSource["type"]; label: string }[] = [
  { type: "sub", label: "Subscription" },
  { type: "free", label: "Free" },
  { type: "rent", label: "Rent" },
  { type: "buy", label: "Buy" },
];
const CREW: { role: Role; label: string }[] = [
  { role: "director", label: "Director" }, { role: "writer", label: "Writers" }, { role: "composer", label: "Music" },
  { role: "cinematographer", label: "Cinematography" }, { role: "studio", label: "Studio" },
];

const idOf = async (params: Promise<{ id: string }>) => {
  const id = Number((await params).id);
  return Number.isInteger(id) ? id : null;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = await idOf(params);
  const movie = id ? await movieById(id) : null;
  return movie ? { title: `${movie.title} (${movie.year})`, description: movie.overview ?? undefined } : { title: "Not found" };
}

function NameChips({ names }: { names: string[] }) {
  return (
    <>
      {names.map((n, i) => (
        <span key={n}>
          <Link href={`/name/${encodeURIComponent(n)}`} className="underline-offset-4 hover:underline">{n}</Link>
          {i < names.length - 1 && <span className="text-white/40">, </span>}
        </span>
      ))}
    </>
  );
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = await idOf(params);
  const movie = id ? await movieById(id) : null;
  if (!movie) notFound();

  const viewer = await getViewerId();
  const [watch, similar, credits, rating] = await Promise.all([
    getWatchInfo(movie.id, movie.imdbId), similarMovies(movie.id), getCredits(movie.id), getRating(viewer, movie.id),
  ]);
  const hasWhere = movie.archiveId || watch.sources.length > 0;

  return (
    <>
      <section className="relative overflow-hidden bg-deep">
        {movie.posterUrl && <Image src={movie.posterUrl} alt="" fill sizes="100vw" className="scale-110 object-cover opacity-25 blur-2xl" unoptimized />}
        <div className="absolute inset-0 bg-gradient-to-t from-night to-transparent" />
        <div className="relative flex flex-col gap-6 px-4 py-8 md:flex-row md:px-10 md:py-10">
          <div className="relative aspect-[2/3] w-[200px] shrink-0 self-center overflow-hidden rounded-lg bg-slate/40 shadow-2xl md:w-[240px] md:self-start">
            <Image src={movie.posterUrl ?? "https://placehold.co/300x450/00072a/FFFFFF?text=No+Poster"} alt={`${movie.title} poster`} fill sizes="240px" className="object-cover" unoptimized priority />
          </div>
          <div className="max-w-2xl">
            <h1 className="font-carter-one text-4xl md:text-5xl">{movie.title} <span className="text-white/60">({movie.year})</span></h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {movie.archiveId && <span className="rounded-full bg-butter px-3 py-1 text-xs font-bold text-night">Free to watch</span>}
              {movie.rated && <span className={pill}>{movie.rated}</span>}
              {movie.runtimeMin && <span className={pill}>{movie.runtimeMin} min</span>}
              {movie.rating && <span className={`${pill} text-butter`}>★ {movie.rating}</span>}
              {movie.countries[0] && <span className={pill}>{movie.countries.join(", ")}</span>}
              {movie.languages[0] && <span className={pill}>{movie.languages.join(", ")}</span>}
            </div>
            {movie.awards && <p className="mt-3 text-sm text-butter">{movie.awards}</p>}
            <p className="mt-4 leading-relaxed text-white/90">{movie.overview}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              {movie.archiveId && <Link href={`/watch/${movie.id}`} className="rounded-md bg-pop px-6 py-3 font-bold text-night hover:brightness-110">Play free</Link>}
              <Link href={`/search?${new URLSearchParams({ q: `films like ${movie.title}`, ask: "1" })}`} className="rounded-md bg-white/10 px-5 py-3 font-bold hover:bg-white/20">Ask PopChoice for more like this</Link>
            </div>
            <div className="mt-4"><TasteButtons movieId={movie.id} initial={rating} /></div>
          </div>
        </div>
      </section>

      <section className="px-4 py-4 md:px-10">
        <h2 className="mb-3 text-lg font-bold">Cast &amp; crew</h2>
        <dl className="grid max-w-3xl gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
          {credits.actor.length > 0 && (<><dt className="text-white/60">Cast</dt><dd><NameChips names={credits.actor} /></dd></>)}
          {CREW.map(({ role, label }) => credits[role].length > 0 && (
            <div key={role} className="contents"><dt className="text-white/60">{label}</dt><dd><NameChips names={credits[role]} /></dd></div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {movie.genres.map((g) => <Link key={g} href={`/genre/${encodeURIComponent(g)}`} className={`${pill} hover:brightness-125`}>{g}</Link>)}
          {movie.tags.slice(0, 6).map((t) => <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className={`${pill} bg-deep ring-1 ring-white/20 hover:brightness-125`}>{t}</Link>)}
        </div>
        {movie.wikiUrl && <a href={movie.wikiUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-white/70 underline underline-offset-4">Plot on Wikipedia</a>}
      </section>

      {hasWhere && (
        <section className="px-4 py-3 md:px-10">
          <h2 className="mb-2 text-lg font-bold">Where to watch</h2>
          {movie.archiveId && (
            <p className="mb-2 text-sm">Free on PopStream: <Link href={`/watch/${movie.id}`} className="font-bold text-pop underline underline-offset-4">Play free</Link></p>
          )}
          {GROUPS.map(({ type, label }) => {
            const list = watch.sources.filter((s) => s.type === type);
            if (!list.length) return null;
            return (
              <div key={type} className="mb-2 flex flex-wrap items-center gap-2">
                <span className="w-28 text-sm text-white/60">{label}</span>
                {list.map((s) => (
                  <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
                    {s.name}{s.price ? ` · $${s.price}` : ""}
                  </a>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {watch.trailerUrl && (
        <section className="px-4 py-3 md:px-10">
          <h2 className="mb-2 text-lg font-bold">Trailer</h2>
          <iframe src={watch.trailerUrl} title={`${movie.title} trailer`} allowFullScreen className="aspect-video w-full max-w-2xl rounded-md" />
        </section>
      )}

      <PosterRow title="More like this" movies={similar} />
    </>
  );
}
