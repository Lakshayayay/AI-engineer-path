import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { embedQuery, hybridSearch, listMovies } from "@/lib/movies";
import { PosterGrid, PosterRow } from "../_components/PosterRow";

const ROW_GENRES = ["Drama", "Comedy", "Sci-Fi", "Horror", "Animation"];

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection(); // needs the database at request time, never at build time
  const q = (await searchParams).q?.trim();

  if (q) {
    // Same hybrid engine as PopChoice: keyword arm catches names, vector arm catches meaning.
    const results = await hybridSearch({ queryText: q, embedding: await embedQuery(q), matchCount: 24 });
    return (
      <>
        <h1 className="px-4 md:px-10 pt-6 text-xl font-bold">Results for “{q}”</h1>
        {results.length ? <PosterGrid movies={results} /> : <p className="px-4 md:px-10 py-6 text-white/60">Nothing found.</p>}
      </>
    );
  }

  const [free, top, classics, ...byGenre] = await Promise.all([
    listMovies({ watchable: true, limit: 20 }),
    listMovies({ orderBy: "rating", limit: 20 }),
    listMovies({ yearMax: 1969, limit: 20 }),
    ...ROW_GENRES.map((genre) => listMovies({ genre, limit: 20 })),
  ]);
  const hero = free[0] ?? top[0];

  return (
    <>
      {hero && (
        <Link href={`/title/${hero.id}`} className="relative block h-[42vh] min-h-[280px] overflow-hidden">
          <Image src={hero.posterUrl ?? "https://placehold.co/600x900/0b0d17/FFFFFF?text=PopStream"} alt="" fill className="object-cover blur-sm scale-110 opacity-40" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d17] via-transparent" />
          <div className="absolute bottom-6 left-4 md:left-10">
            <p className="text-xs uppercase tracking-widest text-[#51e08a]">{hero.archiveId ? "Free to watch" : "Featured"}</p>
            <h1 className="text-3xl md:text-5xl font-bold">{hero.title}</h1>
            <span className="mt-3 inline-block rounded-md bg-[#51e08a] px-4 py-2 text-sm font-bold text-[#000c36]">
              {hero.archiveId ? "▶ Play" : "Details"}
            </span>
          </div>
        </Link>
      )}
      {!hero && <p className="px-4 md:px-10 py-10 text-white/60">The catalog is empty. Run <code>npm run pipeline</code> first.</p>}
      <PosterRow title="Free to watch now" movies={free} />
      <PosterRow title="Top rated" movies={top} />
      <PosterRow title="Classics before 1970" movies={classics} />
      {ROW_GENRES.map((g, i) => <PosterRow key={g} title={g} movies={byGenre[i]} />)}
    </>
  );
}
