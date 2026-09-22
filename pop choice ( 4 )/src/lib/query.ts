// Plain-words filters: "90s comedy under 2 hours" -> filters + removable chips + leftover text.
// Pure (no imports) so it runs in the browser, the server and the node test runner.

interface QueryFilters {
  genres?: string[];
  yearMin?: number;
  yearMax?: number;
  maxRuntime?: number;
  minRating?: number;
  onlyWatchable?: boolean;
}
export interface Chip { key: string; label: string }
interface ParsedQuery { filters: QueryFilters; chips: Chip[]; residual: string }

const GENRE_WORDS: Record<string, string> = {
  action: 'Action', adventure: 'Adventure', animated: 'Animation', animation: 'Animation', cartoon: 'Animation',
  biopic: 'Biography', biography: 'Biography', comedy: 'Comedy', comedies: 'Comedy', funny: 'Comedy',
  crime: 'Crime', documentary: 'Documentary', drama: 'Drama', family: 'Family', kids: 'Family',
  fantasy: 'Fantasy', noir: 'Film-Noir', history: 'History', historical: 'History', horror: 'Horror',
  scary: 'Horror', spooky: 'Horror', musical: 'Musical', musicals: 'Musical', mystery: 'Mystery',
  romance: 'Romance', romantic: 'Romance', 'sci-fi': 'Sci-Fi', scifi: 'Sci-Fi', 'sci fi': 'Sci-Fi',
  'science fiction': 'Sci-Fi', sport: 'Sport', sports: 'Sport', thriller: 'Thriller', suspense: 'Thriller',
  war: 'War', western: 'Western', westerns: 'Western',
};
const GENRE_RE = new RegExp(`\\b(${Object.keys(GENRE_WORDS).sort((a, b) => b.length - a.length).join('|')})\\b`, 'gi');

const DECADE = /(?<![\d/])(?:(19|20)(\d)0|'?(\d)0)'?s\b/i;             // 1990s, 90s, '90s
const YEAR_BOUND = /\b(before|after|since|until)\s+((?:19|20)\d\d)\b/i;
const RUNTIME = /\b(?:under|less than|shorter than|below|within)\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i;
const FREE = /\bfree(?:\s+to\s+watch)?\b/i;
const RATED = /\b(?:highly|top|well|critically)[\s-]+(?:rated|acclaimed)\b|\bacclaimed\b/i;
const FILLER = /\b(?:movies?|films?)\b/gi;

export function parseQuery(text: string, off: readonly string[] = []): ParsedQuery {
  const filters: QueryFilters = {};
  const chips: Chip[] = [];
  let rest = text;
  const on = (key: string) => !off.includes(key);
  const take = (re: RegExp, apply: (m: RegExpMatchArray) => Chip | null) => {
    const m = rest.match(re);
    if (!m) return;
    const chip = apply(m);
    if (chip && on(chip.key)) { chips.push(chip); rest = rest.replace(m[0], ' '); }
  };

  take(DECADE, (m) => {
    const two = m[2] !== undefined ? Number(`${m[2]}0`) : Number(`${m[3]}0`);
    const start = m[1] ? Number(`${m[1]}${m[2]}0`) : two >= 30 ? 1900 + two : 2000 + two; // "30s".."90s" -> 19xx, "00s".."20s" -> 20xx
    if (on('decade')) { filters.yearMin = start; filters.yearMax = start + 9; }
    return { key: 'decade', label: `${start}s` };
  });
  take(YEAR_BOUND, (m) => {
    const y = Number(m[2]);
    const before = /before|until/i.test(m[1]);
    if (on('year')) { if (before) filters.yearMax = y - 1; else filters.yearMin = /after/i.test(m[1]) ? y + 1 : y; }
    return { key: 'year', label: `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${y}` };
  });
  take(RUNTIME, (m) => {
    const n = Number(m[1]);
    const hours = /^h/i.test(m[2]);
    if (on('runtime')) filters.maxRuntime = Math.round(hours ? n * 60 : n);
    return { key: 'runtime', label: `Under ${n} ${hours ? (n === 1 ? 'hour' : 'hours') : 'minutes'}` };
  });
  take(RATED, () => { if (on('rating')) filters.minRating = 7.5; return { key: 'rating', label: 'Highly rated' }; });
  take(FREE, () => { if (on('free')) filters.onlyWatchable = true; return { key: 'free', label: 'Free to watch' }; });

  rest = rest.replace(GENRE_RE, (word) => {
    const genre = GENRE_WORDS[word.toLowerCase()];
    if (!on(`genre:${genre}`)) return word;
    if (!chips.some((c) => c.key === `genre:${genre}`)) {
      chips.push({ key: `genre:${genre}`, label: genre });
      (filters.genres ??= []).push(genre);
    }
    return ' ';
  });

  const residual = rest.replace(FILLER, ' ').replace(/\s+/g, ' ').trim();
  return { filters, chips, residual };
}
