import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { searchFilms } from "@/lib/search";
import { getSignals, getViewerId } from "@/lib/viewer";
import { AskForm } from "../_components/AskForm";
import { PopChoicePick } from "../_components/PopChoicePick";
import { ResultCard } from "../_components/PosterRow";
import { Track } from "../_components/Track";

type Params = { q?: string; ask?: string; off?: string; exact?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }) {
  const q = (await searchParams).q?.trim();
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 300);
  if (!q) redirect("/");

  const off = sp.off?.split(",").filter(Boolean) ?? [];
  const viewer = await getViewerId();
  const signals = await getSignals(viewer);
  const { hits, chips, corrected } = await searchFilms(q, { off, viewerId: viewer, exact: sp.exact === "1" });

  const href = (extra: Record<string, string>) => `/search?${new URLSearchParams({ q, ...extra })}`;
  return (
    <>
      <div className="px-4 pt-6 md:px-10">
        <div className="max-w-3xl"><AskForm defaultValue={q} recent={signals.searches.slice(0, 4).map((s) => s.query)} /></div>

        {corrected && (
          <p className="mt-4 text-sm">
            Showing results for <strong>{corrected}</strong>
            <span className="text-white/60"> · </span>
            <Link href={href({ exact: "1", ...(off.length ? { off: off.join(",") } : {}) })} className="underline underline-offset-4">Search instead for “{q}”</Link>
          </p>
        )}

        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Filters applied">
            {chips.map((c) => (
              <li key={c.key}>
                <Link
                  href={href({ off: [...off, c.key].join(","), ...(sp.exact === "1" ? { exact: "1" } : {}) })}
                  aria-label={`Remove filter ${c.label}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate px-3 py-1 text-sm hover:brightness-125"
                >
                  {c.label} <span aria-hidden>✕</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <PopChoicePick key={q} q={q} autoRun={sp.ask === "1"} />
      </div>

      {hits.length > 0 ? (
        <>
          <h1 className="px-4 text-lg font-bold md:px-10">{hits.length} {hits.length === 1 ? "film" : "films"} for “{q}”</h1>
          <ul className="grid gap-3 px-4 py-4 md:grid-cols-2 md:px-10 xl:grid-cols-3">
            {hits.map((h) => <li key={h.id}><ResultCard hit={h} /></li>)}
          </ul>
          <Track kind="search" query={q} resultIds={hits.map((h) => h.id)} />
        </>
      ) : (
        <div className="px-4 py-10 md:px-10">
          <h1 className="text-lg font-bold">No films match “{q}”</h1>
          <p className="mt-1 text-white/70">Try describing the story or the mood{chips.length ? ", or remove a filter above" : ""}.</p>
        </div>
      )}
    </>
  );
}
