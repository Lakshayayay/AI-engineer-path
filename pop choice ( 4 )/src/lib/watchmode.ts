// "Where to watch" via Watchmode's free tier (2,500 calls/month).
// Terms allow caching non-image data for 30 days, so results live in the watch_sources table.
import { serviceDb } from './movies';

export interface WatchSource {
  name: string;
  type: 'sub' | 'free' | 'rent' | 'buy';
  url: string;
  price: number | null;
}
interface WatchInfo {
  sources: WatchSource[];
  trailerUrl: string | null; // YouTube embed URL
}

const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EMPTY: WatchInfo = { sources: [], trailerUrl: null };

const region = () => process.env.WATCH_REGION ?? 'US';

async function fetchFromWatchmode(imdbId: string, apiKey: string): Promise<WatchInfo | null> {
  const details = (id: string) =>
    fetch(`https://api.watchmode.com/v1/title/${id}/details/?apiKey=${apiKey}&append_to_response=sources&regions=${region()}`);

  let res = await details(imdbId);
  if (!res.ok) {
    // Fall back to resolving the Watchmode id from the IMDb id.
    const search = await fetch(`https://api.watchmode.com/v1/search/?apiKey=${apiKey}&search_field=imdb_id&search_value=${imdbId}`);
    const id = search.ok ? (await search.json()).title_results?.[0]?.id : null;
    if (!id) return null;
    res = await details(String(id));
    if (!res.ok) return null;
  }
  const json = await res.json();

  const seen = new Set<string>();
  const sources: WatchSource[] = [];
  for (const s of json.sources ?? []) {
    const key = `${s.name}:${s.type}`;
    if (seen.has(key) || !s.web_url) continue;
    seen.add(key);
    sources.push({ name: s.name, type: s.type, url: s.web_url, price: s.price ?? null });
  }
  const yt = /[?&]v=([\w-]{6,})/.exec(json.trailer ?? '')?.[1];
  return { sources, trailerUrl: yt ? `https://www.youtube-nocookie.com/embed/${yt}` : null };
}

// Never throws: the page must render even if Watchmode or the key is missing.
export async function getWatchInfo(movieId: number, imdbId: string): Promise<WatchInfo> {
  try {
    const db = serviceDb();
    const { data: row } = await db.from('watch_sources').select('*').eq('movie_id', movieId).maybeSingle();
    if (row && row.region === region() && Date.now() - new Date(row.fetched_at).getTime() < TTL_MS) {
      return { sources: row.sources, trailerUrl: row.trailer_url };
    }

    const apiKey = process.env.WATCHMODE_API_KEY;
    if (!apiKey) return EMPTY;
    const fresh = await fetchFromWatchmode(imdbId, apiKey);
    if (!fresh) return row ? { sources: row.sources, trailerUrl: row.trailer_url } : EMPTY; // stale beats nothing

    await db.from('watch_sources').upsert({
      movie_id: movieId,
      region: region(),
      sources: fresh.sources,
      trailer_url: fresh.trailerUrl,
      fetched_at: new Date().toISOString(),
    });
    return fresh;
  } catch (err) {
    console.error('getWatchInfo failed:', err);
    return EMPTY;
  }
}
