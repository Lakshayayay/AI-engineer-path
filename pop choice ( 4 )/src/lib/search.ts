// The PopStream search engine: plain-words filters + did-you-mean + hybrid retrieval + "why it matched" tags.
// One embedding call per search; everything else is SQL.
import { creditMatches, embedQuery, hybridSearch, suggest, type Candidate, type Role } from './movies';
import { parseQuery, type Chip } from './query';

export interface Why { label: string; snippet?: string }
export interface SearchHit extends Candidate { why: Why; forYou: boolean }
interface SearchOutcome {
  hits: SearchHit[];
  chips: Chip[];
  residual: string;
  corrected: string | null; // the name/title we searched for instead of what was typed
  filtersActive: boolean;
}

const VERB: Record<Role, string> = {
  actor: 'With', director: 'Directed by', writer: 'Written by', composer: 'Music by',
  cinematographer: 'Cinematography by', studio: 'From',
};
const MAX_WORDS_FOR_CORRECTION = 4;
const MIN_CORRECTION_SCORE = 0.5;

// "Title (1999), plot: Neo is..." -> "Neo is..." (chunks are prefixed with the title so they stand alone)
const snippet = (chunk: string) => {
  const body = chunk.replace(/^[\s\S]*?\(\d{4}\),\s*(?:plot|reception|facts):\s*/, '');
  return body.length > 170 ? `${body.slice(0, 167).replace(/\s+\S*$/, '')}…` : body;
};

export async function searchFilms(
  text: string,
  { off = [], viewerId, limit = 24, exact = false }: { off?: string[]; viewerId?: string; limit?: number; exact?: boolean },
): Promise<SearchOutcome> {
  const { filters, chips, residual } = parseQuery(text, off);
  const words = residual.split(/\s+/).filter(Boolean);

  // Did-you-mean: a short query that closely resembles (but isn't exactly) a person, studio or title is searched as that name.
  let corrected: string | null = null;
  const [embedding, best] = await Promise.all([
    embedQuery(text),
    residual && !exact && words.length <= MAX_WORDS_FOR_CORRECTION ? suggest(residual, 1).catch(() => []) : Promise.resolve([]),
  ]);
  if (best[0] && best[0].score >= MIN_CORRECTION_SCORE && !residual.toLowerCase().includes(best[0].label.toLowerCase())) {
    corrected = best[0].label;
  }

  const keywordText = corrected ? `"${corrected.replaceAll('"', '')}"` : residual;
  const found = await hybridSearch({
    queryText: keywordText,
    embedding,
    filters,
    onlyWatchable: filters.onlyWatchable,
    matchCount: limit,
    viewerId,
  });

  const matches = new Map((await creditMatches(corrected ?? residual, found.map((h) => h.id)).catch(() => [])).map((m) => [m.movieId, m]));
  const hits = found.map((h): SearchHit => {
    const m = matches.get(h.id);
    let why: Why;
    if (m) why = { label: `${VERB[m.role]} ${m.name}` };
    else if (h.chunkKind === 'plot') why = { label: 'Story match', snippet: snippet(h.chunk) };
    else if (h.chunkKind === 'reception') why = { label: 'Critics say', snippet: snippet(h.chunk) };
    else why = { label: 'Matches the mood' };
    return { ...h, why, forYou: h.viaTaste };
  });

  // A short query that names a person or studio ("tom hnaks", "pixar") means "their films": drop the vague meaning matches.
  const named = words.length <= MAX_WORDS_FOR_CORRECTION && matches.size > 0;
  const listed = named ? hits.filter((h) => matches.has(h.id)) : hits;
  // An exact credit match ("With Tom Hanks") is a more precise answer than a vague meaning match, so it goes first.
  listed.sort((a, b) => Number(matches.has(b.id)) - Number(matches.has(a.id))); // stable: keeps rank order within each group
  return { hits: listed, chips, residual, corrected, filtersActive: chips.length > 0 };
}
