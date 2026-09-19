// Anonymous taste profile. The viewer is a random UUID in an httpOnly cookie: no account, no personal data.
// Server-only (uses the service-role client; viewer_events has RLS on with no policies).
import { cache } from 'react';
import { cookies } from 'next/headers';
import { moviesByIds, serviceDb, similarMovies, type MovieCard } from './movies';

export const VIEWER_COOKIE = 'pc_viewer';
export const ONBOARDED_COOKIE = 'pc_onboarded';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YEAR = 60 * 60 * 24 * 365;

export async function getViewerId(): Promise<string | undefined> {
  const v = (await cookies()).get(VIEWER_COOKIE)?.value;
  return v && UUID.test(v) ? v : undefined;
}

// Route handlers only: creates the cookie on the first event.
export async function ensureViewerId(): Promise<string> {
  const existing = await getViewerId();
  if (existing) return existing;
  const id = crypto.randomUUID();
  (await cookies()).set(VIEWER_COOKIE, id, { httpOnly: true, sameSite: 'lax', maxAge: YEAR, path: '/' });
  return id;
}

export async function clearViewer(viewer: string) {
  const { error } = await serviceDb().from('viewer_events').delete().eq('viewer_id', viewer);
  if (error) throw error;
  const jar = await cookies();
  jar.delete(VIEWER_COOKIE);
  jar.delete(ONBOARDED_COOKIE);
}

export interface Signals {
  liked: number[];                // newest first, latest rating wins ("unrate" removes)
  disliked: number[];
  played: number[];               // newest first, distinct
  searches: { query: string; resultIds: number[] }[]; // newest first, distinct queries
}

const EMPTY: Signals = { liked: [], disliked: [], played: [], searches: [] };

// Deduped per request, so the home page can ask several times without repeating the query.
export const getSignals = cache(async (viewer: string | undefined): Promise<Signals> => {
  if (!viewer) return EMPTY;
  const { data, error } = await serviceDb()
    .from('viewer_events')
    .select('kind, movie_id, query, result_ids')
    .eq('viewer_id', viewer)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;

  const seen = new Set<number>();      // movies whose latest rating we already decided
  const out: Signals = { liked: [], disliked: [], played: [], searches: [] };
  const queries = new Set<string>();
  const playedSet = new Set<number>();
  for (const e of data as { kind: string; movie_id: number | null; query: string | null; result_ids: number[] | null }[]) {
    if (e.kind === 'search' && e.query && !queries.has(e.query)) {
      queries.add(e.query);
      out.searches.push({ query: e.query, resultIds: e.result_ids ?? [] });
    } else if (e.kind === 'play' && e.movie_id && !playedSet.has(e.movie_id)) {
      playedSet.add(e.movie_id);
      out.played.push(e.movie_id);
    } else if (e.movie_id && !seen.has(e.movie_id) && ['like', 'dislike', 'unrate'].includes(e.kind)) {
      seen.add(e.movie_id);
      if (e.kind === 'like') out.liked.push(e.movie_id);
      if (e.kind === 'dislike') out.disliked.push(e.movie_id);
    }
  }
  return out;
});

export async function getRating(viewer: string | undefined, movieId: number): Promise<'like' | 'dislike' | null> {
  const s = await getSignals(viewer);
  return s.liked.includes(movieId) ? 'like' : s.disliked.includes(movieId) ? 'dislike' : null;
}

export const hasSignal = (s: Signals) => s.liked.length + s.played.length > 0;

// "Top picks for you": nearest films to the taste vector (SQL: taste_picks).
export async function tastePicks(viewer: string | undefined, n = 12): Promise<MovieCard[]> {
  if (!viewer) return [];
  const { data, error } = await serviceDb().rpc('taste_picks', { viewer, n });
  if (error) throw error;
  return (data as { movie_id: number; title: string; release_year: number | null; poster_url: string | null; archive_id: string | null }[])
    .map((r) => ({ id: r.movie_id, title: r.title, year: r.release_year, posterUrl: r.poster_url, archiveId: r.archive_id }));
}

export async function recentlyWatched(s: Signals, n = 12): Promise<MovieCard[]> {
  return moviesByIds(s.played.slice(0, n));
}

// The latest thing they played or liked, plus its nearest neighbours.
export async function becauseYouWatched(s: Signals): Promise<{ movie: MovieCard; similar: MovieCard[] } | null> {
  const id = s.played[0] ?? s.liked[0];
  if (!id) return null;
  const [movie] = await moviesByIds([id]);
  if (!movie) return null;
  return { movie, similar: (await similarMovies(id, 12)).filter((m) => !s.disliked.includes(m.id)) };
}

// Re-uses the stored result ids, so showing "Because you searched..." costs zero embeddings.
export async function lastSearch(s: Signals): Promise<{ query: string; movies: MovieCard[] } | null> {
  const last = s.searches.find((x) => x.resultIds.length >= 4);
  if (!last) return null;
  return { query: last.query, movies: (await moviesByIds(last.resultIds.slice(0, 12))).filter((m) => !s.disliked.includes(m.id)) };
}
