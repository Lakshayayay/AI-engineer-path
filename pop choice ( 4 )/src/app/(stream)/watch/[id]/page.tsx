import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getMovie } from "@/lib/movies";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = Number((await params).id);
  const movie = Number.isInteger(id) ? await getMovie(id) : null;
  if (!movie?.archiveId) notFound(); // only public-domain films with a verified archive.org copy play in-app

  return (
    <div className="px-4 md:px-10 py-4">
      <Link href={`/title/${movie.id}`} className="text-sm text-white/60 hover:text-white">← {movie.title}</Link>
      <iframe
        src={`https://archive.org/embed/${encodeURIComponent(movie.archiveId)}`}
        title={movie.title}
        allowFullScreen
        className="mt-3 w-full aspect-video rounded-md bg-black"
      />
      <p className="mt-2 text-xs text-white/40">Public-domain film, streamed from the Internet Archive.</p>
    </div>
  );
}
