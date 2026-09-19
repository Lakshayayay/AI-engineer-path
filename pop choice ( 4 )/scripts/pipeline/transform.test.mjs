import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChunks, buildMovie, cleanOmdb, dedupeCatalog, extractSections, isPlayable, parseCatalog } from './transform.mjs';

const omdbRaw = {
  Response: 'True', Type: 'movie', imdbID: 'tt0133093', Title: 'The Matrix', Year: '1999', Rated: 'R',
  Runtime: '136 min', Genre: 'Action, Sci-Fi', Director: 'Lana Wachowski', Actors: 'Keanu Reeves, Carrie-Anne Moss',
  Plot: 'A hacker learns reality is a simulation.', imdbRating: '8.7', Poster: 'N/A',
};

const wikiText = `Intro paragraph.

== Plot ==
Neo is a hacker.

=== Awakening ===
He takes the red pill.

== Cast ==
Keanu Reeves.

== Reception ==
Critics loved it.
`;

test('cleanOmdb normalizes N/A, runtime, year ranges and lists', () => {
  const m = cleanOmdb({ ...omdbRaw, Year: '1999–2003' });
  assert.equal(m.release_year, 1999);
  assert.equal(m.runtime_min, 136);
  assert.deepEqual(m.genres, ['Action', 'Sci-Fi']);
  assert.equal(m.poster_url, null);
  assert.equal(m.rating, 8.7);
});

test('cleanOmdb rejects failures and non-movies', () => {
  assert.equal(cleanOmdb({ Response: 'False' }), null);
  assert.equal(cleanOmdb({ ...omdbRaw, Type: 'series' }), null);
});

test('extractSections finds Plot (sub-headings stripped) and Reception', () => {
  const s = extractSections(wikiText);
  assert.match(s.plot, /Neo is a hacker\.\s+He takes the red pill\./);
  assert.doesNotMatch(s.plot, /===|Keanu/);
  assert.equal(s.reception, 'Critics loved it.');
});

test('extractSections handles a missing section and empty input', () => {
  assert.equal(extractSections('== Cast ==\nx').plot, null);
  assert.deepEqual(extractSections(null), { plot: null, reception: null });
});

test('dedupeCatalog collapses duplicate rows and caps per year', () => {
  const row = (imdb, links, year, archiveId = null) => ({ qid: imdb, imdb, links, wikiTitle: imdb, archiveId, year });
  const rows = [row('a', 10, 1999), row('a', 30, 1999), row('b', 20, 1999), row('c', 5, 1999), row('d', 9, 1950, 'ia_d')];
  const out = dedupeCatalog(rows, { perYear: 2, archiveMax: 5 });
  assert.deepEqual(out.map((f) => f.imdb), ['a', 'b', 'd']);
  assert.equal(out[0].links, 30);
});

test('parseCatalog decodes wikipedia titles and optional archive id', () => {
  const json = { results: { bindings: [{
    film: { value: 'http://www.wikidata.org/entity/Q83495' }, imdb: { value: 'tt0133093' }, links: { value: '114' },
    article: { value: 'https://en.wikipedia.org/wiki/Star_Wars:_Episode_I_%E2%80%93_The_Phantom_Menace' },
    first: { value: '1999-05-19T00:00:00Z' },
  }] } };
  const [r] = parseCatalog(json);
  assert.equal(r.year, 1999);
  assert.equal(r.qid, 'Q83495');
  assert.equal(r.wikiTitle, 'Star Wars: Episode I – The Phantom Menace');
  assert.equal(r.archiveId, null);
});

test('isPlayable needs a video file, no restriction, and a public-domain license (or year <= 1930)', () => {
  const pd = 'http://creativecommons.org/licenses/publicdomain/';
  const video = [{ format: 'h.264' }];
  assert.equal(isPlayable({ restricted: false, license: pd, files: video }, 1959), true);
  assert.equal(isPlayable({ restricted: false, license: null, files: video }, 1928), true);   // old enough
  assert.equal(isPlayable({ restricted: false, license: null, files: video }, 1972), false);  // user upload of a copyrighted film
  assert.equal(isPlayable({ restricted: true, license: pd, files: video }, 1959), false);
  assert.equal(isPlayable({ restricted: false, license: pd, files: [{ format: 'JPEG' }] }, 1959), false);
  assert.equal(isPlayable(undefined, 1959), false);
});

test('buildChunks: profile first, bounded size, title on every chunk, stable hashes', async () => {
  const movie = cleanOmdb(omdbRaw);
  const longPlot = 'The hacker escapes the machines and fights agents in the city. '.repeat(80);
  const chunks = await buildChunks(movie, { plot: longPlot, reception: 'Critics loved it.' });

  assert.equal(chunks[0].kind, 'profile');
  assert.match(chunks[0].content, /Directed by Lana Wachowski/);
  assert.ok(chunks.length > 3 && chunks.length <= 12);
  for (const c of chunks) {
    assert.ok(c.content.length <= 1100, `chunk ${c.chunk_index} too long: ${c.content.length}`);
    assert.match(c.content, /The Matrix \(1999\)/);
  }
  assert.deepEqual(chunks.map((c) => c.chunk_index), chunks.map((_, i) => i));
  const again = await buildChunks(movie, { plot: longPlot, reception: 'Critics loved it.' });
  assert.deepEqual(chunks.map((c) => c.content_hash), again.map((c) => c.content_hash));
});

test('buildMovie drops films with no OMDb match or no plot, and gates archive_id on playability', async () => {
  const catalog = { qid: 'Q1', imdb: 'tt0133093', links: 100, wikiTitle: 'The Matrix', archiveId: 'the_matrix_ia', year: 1999 };
  assert.deepEqual(await buildMovie({ catalog, omdb: { Response: 'False' } }), { drop: 'no_omdb' });
  assert.deepEqual(await buildMovie({ catalog, omdb: { ...omdbRaw, Plot: 'N/A' }, wiki: { extract: null } }), { drop: 'no_plot' });

  const ok = await buildMovie({ catalog, omdb: omdbRaw, wiki: { extract: wikiText }, archive: { restricted: false, license: 'http://creativecommons.org/licenses/publicdomain/', files: [{ format: 'MPEG4' }] } });
  assert.equal(ok.movie.archive_id, 'the_matrix_ia');
  const locked = await buildMovie({ catalog, omdb: omdbRaw, wiki: { extract: wikiText }, archive: { restricted: true, license: null, files: [] } });
  assert.equal(locked.movie.archive_id, null);
});
