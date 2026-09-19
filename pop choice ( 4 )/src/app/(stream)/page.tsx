import { cookies } from "next/headers";
import { connection } from "next/server";
import { getMovie, listMovies } from "@/lib/movies";
import { becauseYouWatched, getSignals, getViewerId, hasSignal, lastSearch, recentlyWatched, tastePicks } from "@/lib/viewer";
import { Onboarding } from "./_components/Onboarding";
import { PosterRow, Top10Row } from "./_components/PosterRow";
import { AskBar, GenrePills, Hero, QuizBanner } from "./_components/Sections";

// Chosen from the real genre counts in the catalogue (Animation has only 2 films, so it has no row).
const ROW_GENRES = ["Adventure", "Action", "Sci-Fi", "Fantasy", "Drama", "Romance", "Family", "Horror"];

export default async function HomePage() {
  await connection(); // needs the database (and this viewer's cookie) at request time
  const viewer = await getViewerId();
  const onboarded = (await cookies()).has("pc_onboarded");
  const signals = await getSignals(viewer);
  const personal = hasSignal(signals);

  const [popular, free, rated, classics, picks, recent, because, searched, ...byGenre] = await Promise.all([
    listMovies({ limit: 20 }),
    listMovies({ watchable: true, limit: 20 }),
    listMovies({ orderBy: "rating", limit: 20 }),
    listMovies({ yearMax: 1969, limit: 20 }),
    personal ? tastePicks(viewer, 14) : [],
    recentlyWatched(signals),
    becauseYouWatched(signals),
    lastSearch(signals),
    ...ROW_GENRES.map((genre) => listMovies({ genre, limit: 20 })),
  ]);

  const heroCard = picks[0] ?? free[0] ?? popular[0];
  const hero = heroCard ? await getMovie(heroCard.id) : null;
  const onboardingFilms = [...popular.slice(0, 8), ...free.filter((f) => !popular.slice(0, 8).some((p) => p.id === f.id)).slice(0, 4)];

  return (
    <>
      {hero ? <Hero movie={hero} forYou={picks.length > 0} /> : (
        <p className="px-4 py-10 text-white/70 md:px-10">The catalogue is empty. Run <code>npm run pipeline</code> first.</p>
      )}
      <AskBar recent={signals.searches.slice(0, 4).map((s) => s.query)} />
      {!personal && !onboarded && onboardingFilms.length > 0 && <Onboarding movies={onboardingFilms} />}

      <PosterRow title="Recently watched" movies={recent} />
      <PosterRow title="Top picks for you" movies={picks.slice(1)} forYou />
      {because && <PosterRow title={`Because you watched ${because.movie.title}`} movies={because.similar} />}
      {searched && <PosterRow title={`Because you searched “${searched.query}”`} movies={searched.movies} />}

      <Top10Row title="Top 10 on PopStream" movies={popular} />
      <PosterRow id="free" title="Free to watch now" movies={free} seeAll="/search?q=free%20films" />
      <PosterRow title="Top rated" movies={rated} />
      <PosterRow title="Classics before 1970" movies={classics} />
      {ROW_GENRES.map((g, i) => <PosterRow key={g} title={g} movies={byGenre[i]} seeAll={`/genre/${encodeURIComponent(g)}`} />)}

      <QuizBanner />
      <GenrePills />
    </>
  );
}
