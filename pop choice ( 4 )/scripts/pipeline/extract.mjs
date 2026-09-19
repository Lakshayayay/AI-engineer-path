// EXTRACT: crawl Wikidata (catalog), OMDb (facts), Wikipedia (plot text), archive.org (playability).
// Every response is cached under data/raw/, and existing files are skipped, so the job is resumable.
import path from 'node:path';
import { RAW, exists, politeFetch, readJson, writeJson } from './common.mjs';
import { parseCatalog, selectFilms } from './transform.mjs';

const SPARQL = 'https://query.wikidata.org/sparql';

// Films (Q11424) with an English Wikipedia article and an IMDb id (P345); P724 = "Internet Archive ID".
// Fame proxy = Wikipedia sitelink count. Ordering/filtering a whole year in one query hits WDQS's
// 60s limit, so we pull a few sitelink bands (no ORDER BY) and rank in JS instead.
const BANDS = [[60, 99999], [40, 60], [30, 40], [25, 30]];

function catalogQuery({ archiveOnly, band }) {
  const scope = archiveOnly
    ? '?film wdt:P724 ?ia0 .'
    : `FILTER(?links >= ${band[0]} && ?links < ${band[1]}) OPTIONAL { ?film wdt:P724 ?ia0 }`;
  return `SELECT ?film ?imdb ?links ?article (MIN(?date) AS ?first) (SAMPLE(?ia0) AS ?ia) WHERE {
    ?film wdt:P31 wd:Q11424 ; wdt:P345 ?imdb ; wikibase:sitelinks ?links .
    FILTER(STRSTARTS(?imdb, "tt"))
    ${scope}
    ?article schema:about ?film ; schema:isPartOf <https://en.wikipedia.org/> .
    OPTIONAL { ?film wdt:P577 ?date }
  } GROUP BY ?film ?imdb ?links ?article ${archiveOnly ? 'ORDER BY DESC(?links) LIMIT 400' : ''}`;
}

async function extractCatalog() {
  const jobs = [
    { file: 'archive', archiveOnly: true },
    ...BANDS.map((band) => ({ file: `band-${band[0]}`, band })),
  ];
  for (const job of jobs) {
    const file = path.join(RAW, 'wikidata', `${job.file}.json`);
    if (await exists(file)) continue;
    const url = `${SPARQL}?format=json&query=${encodeURIComponent(catalogQuery(job))}`;
    const res = await politeFetch(url);
    if (!res.ok) { console.warn(`wikidata ${job.file}: HTTP ${res.status}, will retry on next run`); continue; }
    await writeJson(file, await res.json());
    console.log(`wikidata ${job.file}: cached`);
  }
}

// Fetch one raw file unless we already have it. Returns 'cached' | 'fetched' | 'limit' | 'failed'.
async function cached(kind, key, fetchOne) {
  const file = path.join(RAW, kind, `${key}.json`);
  if (await exists(file)) return 'cached';
  try {
    const data = await fetchOne();
    if (data === 'limit') return 'limit';
    await writeJson(file, data);
    return 'fetched';
  } catch (err) {
    if (err.fatal) throw err;
    console.warn(`${kind} ${key}: ${err.message}`);
    return 'failed';
  }
}

const omdb = (imdb) => async () => {
  const res = await politeFetch(`https://www.omdbapi.com/?i=${imdb}&plot=full&apikey=${process.env.OMDB_API_KEY}`);
  const json = await res.json();
  if (/limit/i.test(json.Error ?? '')) return 'limit'; // free tier: 1,000/day. Not cached, so tomorrow's run retries it.
  if (/api key/i.test(json.Error ?? '')) {
    // Config problem, not a per-film miss: stop the whole run and never cache this response.
    throw Object.assign(new Error(`OMDb rejected the key: ${json.Error}`), { fatal: true });
  }
  return json; // "Incorrect IMDb ID." / "Movie not found!" are real per-film answers, safe to cache
};

const wiki = (title) => async () => {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(title)}`;
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const page = (await res.json()).query?.pages?.[0];
  return { title: page?.title ?? title, extract: page?.extract ?? null };
};

const archive = (id) => async () => {
  const res = await politeFetch(`https://archive.org/metadata/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // Keep only what isPlayable() needs; the full file listing can be huge.
  return {
    license: json.metadata?.licenseurl ?? null,
    restricted: json.metadata?.['access-restricted-item'] === 'true' || json.is_dark === true,
    files: (json.files ?? []).map((f) => ({ name: f.name, format: f.format })),
  };
};

// archive.org has no request cap, so vet every free-film candidate BEFORE spending OMDb's 1,000/day on them.
// selectFilms() then keeps only the ones whose archive metadata says playable + public domain.
async function extractArchive() {
  const file = path.join(RAW, 'wikidata', 'archive.json');
  if (!(await exists(file))) return;
  const candidates = parseCatalog(await readJson(file)).filter((r) => r.archiveId);
  let fetched = 0;
  for (const r of candidates) if ((await cached('archive', r.archiveId, archive(r.archiveId))) === 'fetched') fetched++;
  console.log(`archive: vetted ${candidates.length} candidates (${fetched} newly fetched)`);
}

export async function extractAll({ limit } = {}) {
  await extractCatalog();
  await extractArchive();
  const films = await selectFilms({ limit });
  console.log(`extract: ${films.length} films selected`);

  const stats = { fetched: 0, cached: 0, failed: 0 };
  let omdbLimited = false;
  for (const [i, f] of films.entries()) {
    const jobs = [
      omdbLimited ? 'skipped' : cached('omdb', f.imdb, omdb(f.imdb)),
      cached('wiki', f.imdb, wiki(f.wikiTitle)),
      f.archiveId ? cached('archive', f.archiveId, archive(f.archiveId)) : 'cached',
    ];
    const [o, ...rest] = await Promise.all(jobs); // different hosts, so they don't slow each other
    if (o === 'limit') {
      omdbLimited = true;
      console.warn('OMDb daily limit reached. Re-run tomorrow; finished films are cached.');
    }
    for (const r of [o, ...rest]) if (r in stats) stats[r]++;
    if ((i + 1) % 100 === 0) console.log(`extract: ${i + 1}/${films.length}`, stats);
  }
  console.log('extract: done', stats);
}
