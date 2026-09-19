import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery } from './query.ts';

test('decade + genre + runtime become filters and chips; nothing is left over', () => {
  const p = parseQuery('90s comedy under 2 hours');
  assert.deepEqual(p.filters, { yearMin: 1990, yearMax: 1999, genres: ['Comedy'], maxRuntime: 120 });
  assert.deepEqual(p.chips.map((c) => c.label), ['1990s', 'Under 2 hours', 'Comedy']);
  assert.equal(p.residual, '');
});

test('two-digit decades, full decades and apostrophes', () => {
  assert.equal(parseQuery("'20s").filters.yearMin, 2020);
  assert.equal(parseQuery('1920s silent').filters.yearMin, 1920);
  assert.equal(parseQuery('the 00s').filters.yearMin, 2000);
  assert.equal(parseQuery('50s noir').residual, '');
});

test('before/after/since a year and minutes', () => {
  assert.equal(parseQuery('before 1970').filters.yearMax, 1969);
  assert.equal(parseQuery('after 2000').filters.yearMin, 2001);
  assert.equal(parseQuery('since 1999').filters.yearMin, 1999);
  assert.equal(parseQuery('under 90 minutes').filters.maxRuntime, 90);
});

test('genre synonyms, free, rated, and filler words', () => {
  const p = parseQuery('scary movies free highly rated');
  assert.deepEqual(p.filters, { genres: ['Horror'], onlyWatchable: true, minRating: 7.5 });
  assert.equal(p.residual, '');
  assert.deepEqual(parseQuery('sci-fi and funny').filters.genres, ['Sci-Fi', 'Comedy']);
});

test('story text and names pass through as the residual', () => {
  assert.equal(parseQuery('the one where a man is stranded on an island').residual, 'the one where a man is stranded on an island');
  const p = parseQuery('music by hans zimmer');
  assert.equal(p.residual, 'music by hans zimmer');
  assert.deepEqual(p.chips, []);
});

test('a removed chip (off) stops filtering and keeps its word in the text', () => {
  const p = parseQuery('90s comedy', ['genre:Comedy']);
  assert.deepEqual(p.filters, { yearMin: 1990, yearMax: 1999 });
  assert.equal(p.residual, 'comedy');
  assert.deepEqual(parseQuery('90s comedy', ['decade']).filters, { genres: ['Comedy'] });
});
