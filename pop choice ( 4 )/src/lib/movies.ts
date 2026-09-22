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

export type Role = 'actor' | 'director' | 'writer' | 'composer' | 'cinematographer' | 'studio';
const ROLES: Role[] = ['actor', 'director', 'writer', 'composer', 'cinematographer', 'studio'];

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
  awards: string | null;
  countries: string[];
  languages: string[];
  tags: string[];
}

export interface Candidate extends MovieCard {
  genres: string[];
  runtimeMin: number | null;
  rating: number | null;
  director: string | null;
  cast: string[];
  chunk: string; // best-matching chunk of text for this movie
  score: number;
  // Why it matched: which chunk type won and which retrieval arms found it.
  chunkKind: string;
  viaMeaning: boolean;
  viaKeywords: boolean;
  viaTaste: boolean;
}

export interface Suggestion {
  kind: 'title' | 'person' | 'studio';
  label: string;
  mainRole: Role | null;
  films: number;
  movieId: number | null;
  posterUrl: string | null;
  score: number;
}

interface CreditMatch { movieId: number; name: string; role: Role }

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
  viewerId?: string;
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
    viewer_id: args.viewerId ?? null,
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
    chunkKind: r.chunk_kind,
    viaMeaning: r.via_meaning,
    viaKeywords: r.via_keywords,
    viaTaste: r.via_taste,
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
    awards: data.awards,
    countries: data.countries ?? [],
    languages: data.languages ?? [],
    tags: data.tags ?? [],
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

// Autocomplete and "did you mean": titles, people and studios ranked by trigram similarity.
export async function suggest(q: string, n = 6): Promise<Suggestion[]> {
  const { data, error } = await db().rpc('suggest', { q, n });
  if (error) throw error;
  return (data as any[]).map((r) => ({
    kind: r.kind,
    label: r.label,
    mainRole: r.main_role,
    films: r.films,
    movieId: r.movie_id,
    posterUrl: r.poster_url,
    score: r.score,
  }));
}

// Which credited person/studio explains why each of these films matched the query text.
export async function creditMatches(q: string, ids: number[]): Promise<CreditMatch[]> {
  if (!ids.length) return [];
  const { data, error } = await db().rpc('credit_matches', { q, ids });
  if (error) throw error;
  return (data as any[]).map((r) => ({ movieId: r.movie_id, name: r.name, role: r.role }));
}

export async function getCredits(movieId: number): Promise<Record<Role, string[]>> {
  const { data, error } = await db().from('credits').select('name, role').eq('movie_id', movieId).order('billing', { nullsFirst: false });
  if (error) throw error;
  const out = Object.fromEntries(ROLES.map((r) => [r, [] as string[]])) as Record<Role, string[]>;
  for (const r of data as any[]) out[r.role as Role].push(r.name);
  return out;
}

// Films with, by or from a person/studio (exact name), grouped by the role they had.
export async function moviesByName(name: string): Promise<{ role: Role; movies: MovieCard[] }[]> {
  const { data, error } = await db()
    .from('credits')
    .select('role, movies(id, title, release_year, poster_url, archive_id, popularity)')
    .eq('name', name);
  if (error) throw error;
  const byRole = new Map<Role, any[]>();
  for (const r of data as any[]) byRole.set(r.role, [...(byRole.get(r.role) ?? []), r.movies]);
  return ROLES.filter((r) => byRole.has(r)).map((role) => ({
    role,
    movies: byRole.get(role)!.sort((a, b) => b.popularity - a.popularity).map(card),
  }));
}

// Cards for specific ids, in the order given.
export async function moviesByIds(ids: number[]): Promise<MovieCard[]> {
  if (!ids.length) return [];
  const { data, error } = await db().from('movies').select('id, title, release_year, poster_url, archive_id').in('id', ids);
  if (error) throw error;
  const byId = new Map((data as any[]).map((r) => [r.id, card(r)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export { db as serviceDb };
