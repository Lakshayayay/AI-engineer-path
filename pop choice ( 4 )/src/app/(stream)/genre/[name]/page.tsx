import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GENRES, listMovies } from "@/lib/movies";
import { PosterGrid } from "../../_components/PosterRow";
import { GenrePills } from "../../_components/Sections";

const nameOf = async (params: Promise<{ name: string }>) => {
  const raw = (await params).name;
  try { return decodeURIComponent(raw); } catch { return raw; }
};

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  return { title: await nameOf(params) };
}

export default async function GenrePage({ params }: { params: Promise<{ name: string }> }) {
  await connection();
  const name = await nameOf(params);
  if (!(GENRES as readonly string[]).includes(name)) notFound();
  const movies = await listMovies({ genre: name, limit: 100 });

  return (
    <>
      <h1 className="font-carter-one px-4 pt-8 text-4xl md:px-10">{name}</h1>
      {movies.length ? <PosterGrid movies={movies} /> : <p className="px-4 py-6 text-white/70 md:px-10">No {name} films yet. Try another genre below.</p>}
      <GenrePills active={name} />
    </>
  );
}
