import Link from "next/link";
import { connection } from "next/server";
import { moviesByIds } from "@/lib/movies";
import { getSignals, getViewerId, hasSignal, recentlyWatched } from "@/lib/viewer";
import { PosterRow } from "../_components/PosterRow";
import { ClearHistory, LikedGrid } from "../_components/YouActions";

export const metadata = { title: "Your taste" };

export default async function YouPage() {
  await connection();
  const s = await getSignals(await getViewerId());
  const [liked, recent] = await Promise.all([moviesByIds(s.liked), recentlyWatched(s, 20)]);

  return (
    <div className="pb-6">
      <div className="px-4 pt-8 md:px-10">
        <h1 className="font-carter-one text-4xl">Your taste</h1>
        <p className="mt-1 max-w-2xl text-white/70">What PopStream uses to shape your home screen. You can remove any of it.</p>
      </div>

      {!hasSignal(s) && s.searches.length === 0 ? (
        <div className="mx-4 mt-6 max-w-2xl rounded-xl bg-deep p-5 md:mx-10">
          <p className="font-bold">Nothing here yet</p>
          <p className="mt-1 text-white/80">Pick a few films you love on the home page, or press “I like this” on any title. Your home will start recommending films to match.</p>
          <Link href="/" className="mt-4 inline-block rounded-md bg-pop px-4 py-2 font-bold text-night hover:brightness-110">Pick films you love</Link>
        </div>
      ) : (
        <>
          {liked.length > 0 && (
            <section className="px-4 pt-6 md:px-10">
              <h2 className="mb-3 text-lg font-bold">Films you like</h2>
              <LikedGrid movies={liked} />
            </section>
          )}
          <div className="pt-4"><PosterRow title="Recently watched" movies={recent} /></div>
          {s.searches.length > 0 && (
            <section className="px-4 pt-4 md:px-10">
              <h2 className="mb-3 text-lg font-bold">Recent searches</h2>
              <ul className="flex flex-wrap gap-2">
                {s.searches.slice(0, 10).map((x) => (
                  <li key={x.query}><Link href={`/search?q=${encodeURIComponent(x.query)}`} className="rounded-full bg-slate px-3 py-1 text-sm hover:brightness-125">{x.query}</Link></li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section className="mx-4 mt-8 max-w-2xl rounded-xl bg-deep p-5 md:mx-10">
        <h2 className="font-bold">How this works</h2>
        <p className="mt-1 text-sm leading-relaxed text-white/80">
          We average what the films you like and watch are about, and find the closest ones you haven&apos;t seen.
          It&apos;s stored against a random ID in this browser: no account, no personal details.
        </p>
        <div className="mt-4"><ClearHistory /></div>
      </section>
    </div>
  );
}
