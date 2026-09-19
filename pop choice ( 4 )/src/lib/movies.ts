// Data-access layer shared by the PopChoice API and the PopStream dashboard.
// Server-only: uses the service-role key (never import this from a client component).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { embed } from 'ai';
import { google } from '@ai-sdk/google';

const EMBED_DIMS = 768; // must match the pipeline and vector(768) in the schema

// OMDb genre vocabulary: the planner is constrained to these so filters match DB values exactly.
export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family',
  'Fantasy', 'Film-Noir', 'History', 'Horror', 'Music', 'Musical', 'Mystery', 'Romance', 'Sci-Fi',
  'Sport', 'Thriller', 'War', 'Western',
] as const;

export interface Filters {
  genres?: string[];
  yearMin?: number;
  yearMax?: number;
  maxRuntime?: number;
  minRating?: number;
}

export interface MovieCard {
  id: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  archiveId: string | null;
}

export interface Movie extends MovieCard {
  imdbId: string;
  genres: string[];
  runtimeMin: number | null;
  rated: string | null;
  rating: number | null;
  director: string | null;
  cast: string[];
  overview: string | null;
  wikiUrl: string | null;
}

export interface Candidate extends MovieCard {
  genres: string[];
  runtimeMin: number | null;
  rating: number | null;
  director: string | null;
  cast: string[];
  chunk: string; // best-matching chunk of text for this movie
  score: number;
}

let client: SupabaseClient | null = null;
function db() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return (client = createClient(url, key));
}

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.embedding('gemini-embedding-001'),
    value: text,
    providerOptions: { google: { outputDimensionality: EMBED_DIMS, taskType: 'RETRIEVAL_QUERY' } },
  });
  return embedding;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come straight from PostgREST */
const card = (r: any): MovieCard => ({
  id: r.id ?? r.movie_id,
  title: r.title,
  year: r.release_year,
  posterUrl: r.poster_url,
  archiveId: r.archive_id,
});

export async function hybridSearch(args: {
  queryText: string;
  embedding: number[];
  filters?: Filters;
  excludeIds?: number[];
  onlyWatchable?: boolean;
  matchCount?: number;
}): Promise<Candidate[]> {
  const f = args.filters ?? {};
  const { data, error } = await db().rpc('hybrid_search', {
    query_text: args.queryText,
    query_embedding: args.embedding,
    match_count: args.matchCount ?? 8,
    filter_genres: f.genres?.length ? f.genres : null,
    year_min: f.yearMin ?? null,
    year_max: f.yearMax ?? null,
    max_runtime: f.maxRuntime ?? null,
    min_rating: f.minRating ?? null,
    exclude_ids: args.excludeIds ?? [],
    only_watchable: args.onlyWatchable ?? false,
  });
  if (error) throw error;
  return (data as any[]).map((r) => ({
    ...card(r),
    genres: r.genres,
    runtimeMin: r.runtime_min,
    rating: r.rating,
    director: r.director,
    cast: r.cast_names,
    chunk: r.chunk_content,
    score: r.score,
  }));
}

export async function similarMovies(id: number, matchCount = 12): Promise<MovieCard[]> {
  const { data, error } = await db().rpc('similar_movies', { target_id: id, match_count: matchCount });
  if (error) throw error;
  return (data as any[]).map(card);
}

export async function getMovie(id: number): Promise<Movie | null> {
  const { data, error } = await db().from('movies').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...card(data),
    imdbId: data.imdb_id,
    genres: data.genres,
    runtimeMin: data.runtime_min,
    rated: data.rated,
    rating: data.rating,
    director: data.director,
    cast: data.cast_names,
    overview: data.overview,
    wikiUrl: data.wiki_url,
  };
}

export async function listMovies(opts: {
  genre?: string;
  watchable?: boolean;
  yearMax?: number;
  orderBy?: 'popularity' | 'rating';
  limit?: number;
}): Promise<MovieCard[]> {
  let q = db().from('movies').select('id, title, release_year, poster_url, archive_id');
  if (opts.genre) q = q.contains('genres', [opts.genre]);
  if (opts.watchable) q = q.not('archive_id', 'is', null);
  if (opts.yearMax) q = q.lte('release_year', opts.yearMax);
  if (opts.orderBy === 'rating') q = q.not('rating', 'is', null).order('rating', { ascending: false });
  q = q.order('popularity', { ascending: false }).limit(opts.limit ?? 20);
  const { data, error } = await q;
  if (error) throw error;
  return (data as any[]).map(card);
}

export { db as serviceDb };
