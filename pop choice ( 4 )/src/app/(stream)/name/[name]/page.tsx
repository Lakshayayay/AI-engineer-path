import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { moviesByName, type Role } from "@/lib/movies";
import { PosterGrid, RowHeading } from "../../_components/PosterRow";

const HEADING: Record<Role, string> = {
  actor: "Acting", director: "Directed", writer: "Written", composer: "Music by", cinematographer: "Cinematography", studio: "From this studio",
};
const ROLE_NAME: Record<Role, string> = {
  actor: "Actor", director: "Director", writer: "Writer", composer: "Composer", cinematographer: "Cinematographer", studio: "Studio",
};

const nameOf = async (params: Promise<{ name: string }>) => {
  const raw = (await params).name;
  try { return decodeURIComponent(raw); } catch { return raw; }
};

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  return { title: await nameOf(params) };
}

export default async function NamePage({ params }: { params: Promise<{ name: string }> }) {
  await connection();
  const name = await nameOf(params);
  const groups = await moviesByName(name);
  if (groups.length === 0) notFound();

  const films = new Set(groups.flatMap((g) => g.movies.map((m) => m.id))).size;
  const main = groups.reduce((a, b) => (b.movies.length > a.movies.length ? b : a)).role;
  return (
    <>
      <div className="px-4 pt-8 md:px-10">
        <h1 className="font-carter-one text-4xl">{name}</h1>
        <p className="mt-1 text-white/70">{ROLE_NAME[main]}, {films} {films === 1 ? "film" : "films"} on PopStream</p>
        <Link
          href={`/search?${new URLSearchParams({ q: `a ${name} film for tonight`, ask: "1" })}`}
          className="mt-4 inline-block rounded-md bg-pop px-5 py-2.5 font-bold text-night hover:brightness-110"
        >
          Ask PopChoice for a {name} film for tonight
        </Link>
      </div>
      {groups.map((g) => (
        <section key={g.role} className="pt-6">
          <RowHeading title={HEADING[g.role]} />
          <PosterGrid movies={g.movies} />
        </section>
      ))}
    </>
  );
}
