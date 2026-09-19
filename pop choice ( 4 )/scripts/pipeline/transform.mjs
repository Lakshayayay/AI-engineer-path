// TRANSFORM: raw source JSON -> clean movie rows + embeddable chunks.
// Everything above `selectFilms` is pure (no network, no disk), so it is unit-testable.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { RAW, PROCESSED, exists, readJson } from './common.mjs';

const PER_YEAR = 20;      // top films (by Wikipedia sitelinks) kept per release year
const ARCHIVE_MAX = 150;  // extra free-to-watch films from Internet Archive

const qid = (uri) => uri.split('/').pop();

// Wikidata SPARQL JSON -> flat rows.
export function parseCatalog(sparqlJson) {
  return sparqlJson.results.bindings.map((b) => ({
    qid: qid(b.film.value),
    imdb: b.imdb.value,
    links: Number(b.links.value),
    wikiTitle: decodeURIComponent(b.article.value.split('/wiki/')[1]).replaceAll('_', ' '),
    archiveId: b.ia?.value ?? null,
    year: b.first ? Number(b.first.value.slice(0, 4)) : null, // earliest release date
  }));
}

// Collapse duplicates by IMDb id, then keep the top PER_YEAR per year plus the top archive films.
export function dedupeCatalog(rows, { perYear = PER_YEAR, archiveMax = ARCHIVE_MAX } = {}) {
  const byImdb = new Map();
  for (const r of rows) {
    const prev = byImdb.get(r.imdb);
    if (!prev) { byImdb.set(r.imdb, { ...r }); continue; }
    prev.links = Math.max(prev.links, r.links);
    prev.archiveId ??= r.archiveId;
    prev.year ??= r.year;
  }
  const films = [...byImdb.values()].sort((a, b) => b.links - a.links);

  const yearCount = new Map();
  const picked = [];
  let archiveCount = 0;
  for (const f of films) {
    if (f.archiveId) {
      if (archiveCount++ < archiveMax) picked.push(f);
      continue;
    }
    const n = yearCount.get(f.year) ?? 0;
    if (n < perYear) { yearCount.set(f.year, n + 1); picked.push(f); }
  }
  return picked; // still sorted by fame, so a daily API cap always spends itself on the best films first
}

const na = (v) => (v == null || v === 'N/A' || v === '' ? null : v);
const list = (v) => (na(v) ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

// OMDb JSON -> our movie fields. Returns null when OMDb has no usable movie.
export function cleanOmdb(raw) {
  if (!raw || raw.Response === 'False' || raw.Type !== 'movie') return null;
  return {
    imdb_id: raw.imdbID,
    title: raw.Title,
    release_year: Number(raw.Year?.match(/\d{4}/)?.[0]) || null,   // "1999–2003" -> 1999
    rated: na(raw.Rated),
    runtime_min: Number(na(raw.Runtime)?.match(/\d+/)?.[0]) || null, // "136 min" -> 136
    genres: list(raw.Genre),
    director: na(raw.Director),
    cast_names: list(raw.Actors),
    overview: na(raw.Plot),
    rating: na(raw.imdbRating) ? parseFloat(raw.imdbRating) : null,
    poster_url: na(raw.Poster),
    awards: na(raw.Awards),
    countries: list(raw.Country),
    languages: list(raw.Language),
  };
}

// Wikidata property -> credit role (or 'tag' for topics). Also the property list extract.mjs asks for.
export const CREDIT_PROPS = {
  P161: 'actor', P57: 'director', P58: 'writer', P86: 'composer', P344: 'cinematographer', P272: 'studio',
  P921: 'tag', P840: 'tag', P144: 'tag', P136: 'tag',
};
const CAST_MAX = 15;
const ROLE_ORDER = ['actor', 'director', 'writer', 'composer', 'cinematographer', 'studio'];

// Wikidata SPARQL rows for a batch of films -> { qid: { P161: [labels], ... } }. Unlabelled entities (raw Q-ids) are dropped.
export function groupWikidataCredits(sparqlJson) {
  const out = {};
  for (const b of sparqlJson.results.bindings) {
    const label = b.valLabel?.value;
    if (!label || /^Q\d+$/.test(label)) continue;
    const film = (out[qid(b.film.value)] ??= {});
    const labels = (film[b.prop.value] ??= []);
    if (!labels.includes(label)) labels.push(label);
  }
  return out;
}

// "Frank Darabont (screenplay), Stephen King (based on...)" -> ['Frank Darabont', 'Stephen King']
const people = (v) => list(v?.replace(/\s*\([^)]*\)/g, ''));

// Merge OMDb's people (already in billing order) with Wikidata's extras into credits[] and tags[].
// OMDb comes first so its billing order wins; Wikidata fills in composer, cinematographer, studio and extra names.
export function parseCredits(omdbRaw, wd = {}) {
  const byRole = {
    actor: [...people(omdbRaw?.Actors), ...(wd.P161 ?? [])],
    director: [...people(omdbRaw?.Director), ...(wd.P57 ?? [])],
    writer: [...people(omdbRaw?.Writer), ...(wd.P58 ?? [])],
    composer: wd.P86 ?? [],
    cinematographer: wd.P344 ?? [],
    studio: [...list(omdbRaw?.Production), ...(wd.P272 ?? [])],
  };
  const credits = [];
  for (const role of ROLE_ORDER) {
    const seen = new Set();
    for (const name of byRole[role]) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (role === 'actor' && seen.size > CAST_MAX) break;
      credits.push({ name, role, billing: seen.size });
    }
  }
  const tags = [...new Set(['P921', 'P840', 'P144', 'P136'].flatMap((p) => wd[p] ?? []).map((t) => t.toLowerCase()))];
  return { credits, tags };
}

const PLOT_HEADINGS = /^(plot|plot summary|synopsis|premise|story|summary)$/i;
const RECEPTION_HEADINGS = /^(reception|critical reception|critical response)$/i;

// Wikipedia plain text marks headings "== Plot ==" (sub-headings use ===). Pull out the sections we want.
export function extractSections(text) {
  if (!text) return { plot: null, reception: null };
  const heading = /^==\s*([^=\n][^\n]*?)\s*==\s*$/gm;
  const marks = [...text.matchAll(heading)].map((m) => ({ name: m[1], start: m.index, bodyStart: m.index + m[0].length }));
  const section = (re) => {
    const i = marks.findIndex((m) => re.test(m.name));
    if (i < 0) return null;
    const end = marks[i + 1]?.start ?? text.length;
    const body = text.slice(marks[i].bodyStart, end)
      .replace(/^={3,}.*={3,}\s*$/gm, '')   // drop sub-headings, keep their text
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return body || null;
  };
  const reception = section(RECEPTION_HEADINGS);
  return { plot: section(PLOT_HEADINGS), reception: reception && reception.slice(0, 1500) };
}

// "Watchable" = archive.org really has a video file, it isn't restricted, AND it is safely public domain:
// either the item carries a public-domain license, or the film is from 1930 or earlier (US public domain as of 2026).
// The feature_films collection also holds user uploads of copyrighted films, so playable alone is not enough.
const PD_LICENSE = /publicdomain|\/zero\//i;
export function isPlayable(meta, year) {
  if (!meta || meta.restricted) return false;
  const hasVideo = (meta.files ?? []).some((f) => /mpeg4|h\.264|webm|ogg video|matroska/i.test(f.format ?? ''));
  const publicDomain = PD_LICENSE.test(meta.license ?? '') || (year != null && year <= 1930);
  return hasVideo && publicDomain;
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });

// Chunk 0 is a "profile" (metadata + short plot) so names/genres are findable by keyword search.
// Every other chunk is prefixed with the title so it still makes sense when retrieved alone.
export async function buildChunks(movie, { plot, reception }, { credits = [], tags = [] } = {}) {
  const label = `${movie.title} (${movie.release_year})`;
  const profile = [
    `${label}.`,
    movie.genres.length && `Genres: ${movie.genres.join(', ')}.`,
    movie.director && `Directed by ${movie.director}.`,
    movie.cast_names.length && `Starring ${movie.cast_names.join(', ')}.`,
    [movie.rated && `Rated ${movie.rated}`, movie.runtime_min && `${movie.runtime_min} min`, movie.rating && `IMDb ${movie.rating}`]
      .filter(Boolean).join(', ').replace(/.+/, '$&.'),
    movie.overview,
  ].filter(Boolean).join(' ');

  const parts = [{ kind: 'profile', content: profile }];
  // ponytail: 12 chunks per film cap (9 plot + 2 reception + profile); raise if very long plots lose their endings.
  for (const c of (await splitter.splitText(plot ?? '')).slice(0, 9)) parts.push({ kind: 'plot', content: `${label}, plot: ${c}` });
  for (const c of (await splitter.splitText(reception ?? '')).slice(0, 2)) parts.push({ kind: 'reception', content: `${label}, reception: ${c}` });

  // Keyword-only "facts" chunk, appended LAST so earlier chunk hashes never change. Names are found by exact
  // full-text/trigram match, so it is stored without an embedding (0 Gemini calls).
  const names = (role) => credits.filter((c) => c.role === role).map((c) => c.name);
  const line = (prefix, items) => (items.length ? `${prefix} ${items.join(', ')}.` : null);
  const facts = [
    label + '.',
    line('Starring', names('actor')), line('Directed by', names('director')), line('Written by', names('writer')),
    line('Music by', names('composer')), line('Cinematography by', names('cinematographer')),
    line('Produced by', names('studio')), line('Topics:', tags),
    movie.countries?.length && `Country: ${movie.countries.join(', ')}.`,
    movie.awards && `Awards: ${movie.awards}.`,
  ].filter(Boolean).join(' ');
  if (credits.length || tags.length) parts.push({ kind: 'facts', content: `${label}, facts: ${facts}` });

  return parts.map((p, i) => ({ chunk_index: i, kind: p.kind, content: p.content, content_hash: sha256(p.content) }));
}

// One film: raw inputs in, {movie, chunks} or {drop: reason} out.
export async function buildMovie({ catalog, omdb, wiki, archive, wikidata }) {
  const clean = cleanOmdb(omdb);
  if (!clean) return { drop: 'no_omdb' };
  const sections = extractSections(wiki?.extract);
  const plot = sections.plot ?? clean.overview;
  if (!plot) return { drop: 'no_plot' };

  const year = clean.release_year ?? catalog.year;
  const movie = {
    ...clean,
    release_year: year,
    wikidata_id: catalog.qid,
    wiki_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(catalog.wikiTitle.replaceAll(' ', '_'))}`,
    archive_id: catalog.archiveId && isPlayable(archive, year) ? catalog.archiveId : null,
    popularity: catalog.links,
  };
  const { credits, tags } = parseCredits(omdb, wikidata);
  movie.tags = tags;
  return { movie, credits, chunks: await buildChunks(movie, { ...sections, plot }, { credits, tags }) };
}

// ---- disk I/O below ----

// The film list is derived from the cached Wikidata files, so extract and transform always agree on it.
export async function selectFilms({ limit } = {}) {
  const rows = [];
  const dir = path.join(RAW, 'wikidata');
  for (const file of (await fs.readdir(dir).catch(() => [])).sort()) {
    const json = await readJson(path.join(dir, file));
    rows.push(...parseCatalog(json));
  }
  // Films whose archive copy was vetted and failed (copyrighted upload, no video, restricted) lose their
  // archive flag and compete as ordinary films. Unvetted ones keep it until extract has checked them.
  for (const r of rows) {
    if (!r.archiveId) continue;
    const file = path.join(RAW, 'archive', `${r.archiveId}.json`);
    if ((await exists(file)) && !isPlayable(await readJson(file), r.year)) r.archiveId = null;
  }
  const films = dedupeCatalog(rows);
  if (!limit) return films;
  // For small test runs keep ~3/4 famous films and ~1/4 free-to-watch ones, so both code paths get exercised.
  const free = films.filter((f) => f.archiveId).slice(0, Math.ceil(limit / 4));
  const rest = films.filter((f) => !f.archiveId).slice(0, limit - free.length);
  return [...rest, ...free];
}

export async function transformAll({ limit } = {}) {
  const films = await selectFilms({ limit });
  const out = [];
  const drops = {};
  for (const catalog of films) {
    const read = async (kind, key) => {
      const file = path.join(RAW, kind, `${key}.json`);
      return (await exists(file)) ? readJson(file) : undefined;
    };
    const omdb = await read('omdb', catalog.imdb);
    if (omdb === undefined) { drops.not_extracted = (drops.not_extracted ?? 0) + 1; continue; }
    const wiki = await read('wiki', catalog.imdb);
    const archive = catalog.archiveId ? await read('archive', catalog.archiveId) : null;
    const wikidata = await read('credits', catalog.qid);

    const built = await buildMovie({ catalog, omdb, wiki, archive, wikidata });
    if (built.drop) { drops[built.drop] = (drops[built.drop] ?? 0) + 1; continue; }
    out.push(JSON.stringify(built));
  }
  await fs.mkdir(PROCESSED, { recursive: true });
  await fs.writeFile(path.join(PROCESSED, 'movies.jsonl'), out.join('\n') + '\n');
  console.log(`transform: kept ${out.length} / ${films.length} films. Dropped:`, drops);
}
