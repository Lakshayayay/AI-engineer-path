import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { similarMovies } from "@/lib/movies";
import { movieById } from "../../_components/movie-cache";
import { PosterRow } from "../../_components/PosterRow";
import { pill } from "../../_components/Sections";
import { Track } from "../../_components/Track";

const idOf = async (params: Promise<{ id: string }>) => {
  const id = Number((await params).id);
  return Number.isInteger(id) ? id : null;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = await idOf(params);
  const movie = id ? await movieById(id) : null;
  return { title: movie ? `Watch ${movie.title}` : "Not found" };
}

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = await idOf(params);
  const movie = id ? await movieById(id) : null;
  if (!movie?.archiveId) notFound(); // only public-domain films with a verified archive.org copy play in-app
  const similar = await similarMovies(movie.id);

  return (
    <>
      <div className="bg-black">
        <div className="mx-auto max-w-6xl">
          <iframe
            src={`https://archive.org/embed/${encodeURIComponent(movie.archiveId)}`}
            title={movie.title}
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
      </div>

      <div className="px-4 py-5 md:px-10">
        <Link href={`/title/${movie.id}`} className="text-sm text-white/70 underline underline-offset-4 hover:text-white">Back to details</Link>
        <h1 className="font-carter-one mt-3 text-3xl">{movie.title} <span className="text-white/60">({movie.year})</span></h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {movie.genres.slice(0, 3).map((g) => <span key={g} className={pill}>{g}</span>)}
          {movie.runtimeMin && <span className={pill}>{movie.runtimeMin} min</span>}
          {movie.rating && <span className={`${pill} text-butter`}>★ {movie.rating}</span>}
        </div>
        <p className="mt-4 max-w-3xl leading-relaxed text-white/90">{movie.overview}</p>
        <p className="mt-3 text-xs text-white/60">Public-domain film, streamed from the Internet Archive.</p>
      </div>

      <PosterRow title="More like this" movies={similar} />
      <Track kind="play" movieId={movie.id} />
    </>
  );
}
