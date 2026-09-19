// LOAD: processed movies.jsonl -> Supabase. Idempotent: only chunks whose hash changed get re-embedded.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { embedMany } from 'ai';
import { google } from '@ai-sdk/google';
import { PROCESSED, sleep } from './common.mjs';

const DIMS = 768;
const MOVIE_BATCH = 50;   // keeps the "existing chunks" lookup under PostgREST's 1,000-row default cap
const EMBED_BATCH = 100;  // Gemini's batch limit
const EMBED_DELAY_MS = Number(process.env.EMBED_DELAY_MS ?? 1000); // raise if you hit free-tier 429s

export async function loadAll() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  const db = createClient(url, key);

  const file = path.join(PROCESSED, 'movies.jsonl');
  const films = (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const stats = { movies: 0, embedded: 0, unchanged: 0, deleted: 0 };

  for (let i = 0; i < films.length; i += MOVIE_BATCH) {
    const batch = films.slice(i, i + MOVIE_BATCH);

    const { data: saved, error } = await db
      .from('movies')
      .upsert(batch.map((f) => f.movie), { onConflict: 'imdb_id' })
      .select('id, imdb_id');
    if (error) throw error;
    const idOf = new Map(saved.map((r) => [r.imdb_id, r.id]));
    stats.movies += saved.length;

    const { data: existing, error: e2 } = await db
      .from('movie_chunks').select('movie_id, chunk_index, content_hash').in('movie_id', [...idOf.values()]);
    if (e2) throw e2;
    const have = new Map(existing.map((r) => [`${r.movie_id}:${r.chunk_index}`, r.content_hash]));

    // Work out which chunks are new/changed.
    const todo = [];
    for (const f of batch) {
      const movie_id = idOf.get(f.movie.imdb_id);
      for (const c of f.chunks) {
        if (have.get(`${movie_id}:${c.chunk_index}`) === c.content_hash) stats.unchanged++;
        else todo.push({ movie_id, ...c });
      }
      // Drop leftover chunks if the film now has fewer than before.
      const stale = existing.filter((r) => r.movie_id === movie_id && r.chunk_index >= f.chunks.length);
      if (stale.length) {
        const { error: e3 } = await db.from('movie_chunks').delete().eq('movie_id', movie_id).gte('chunk_index', f.chunks.length);
        if (e3) throw e3;
        stats.deleted += stale.length;
      }
    }

    for (let j = 0; j < todo.length; j += EMBED_BATCH) {
      const part = todo.slice(j, j + EMBED_BATCH);
      const { embeddings } = await embedMany({
        model: google.embedding('gemini-embedding-001'),
        values: part.map((c) => c.content),
        providerOptions: { google: { outputDimensionality: DIMS, taskType: 'RETRIEVAL_DOCUMENT' } },
      });
      if (embeddings.some((e) => e.length !== DIMS)) throw new Error(`Expected ${DIMS}-dim embeddings`);

      const rows = part.map((c, k) => ({ ...c, embedding: embeddings[k] }));
      const { error: e4 } = await db.from('movie_chunks').upsert(rows, { onConflict: 'movie_id,chunk_index' });
      if (e4) throw e4;
      stats.embedded += rows.length;
      await sleep(EMBED_DELAY_MS);
    }
    console.log(`load: ${Math.min(i + MOVIE_BATCH, films.length)}/${films.length}`, stats);
  }
  console.log('load: done', stats);
}
