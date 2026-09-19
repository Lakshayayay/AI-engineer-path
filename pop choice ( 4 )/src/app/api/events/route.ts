import { z } from 'zod';
import { serviceDb } from '@/lib/movies';
import { clearViewer, ensureViewerId, getViewerId } from '@/lib/viewer';

// ponytail: no rate limit yet. If this is ever public, throttle per viewer id and per IP.
const Body = z.object({
  kind: z.enum(['search', 'play', 'like', 'dislike', 'unrate']),
  movieId: z.number().int().positive().optional(),
  movieIds: z.array(z.number().int().positive()).max(30).optional(), // onboarding batch likes
  query: z.string().trim().min(1).max(200).optional(),
  resultIds: z.array(z.number().int().positive()).max(50).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 });
  const { kind, movieId, movieIds, query, resultIds } = parsed.data;

  const movies = [...(movieIds ?? []), ...(movieId ? [movieId] : [])];
  if (kind === 'search' ? !query : movies.length === 0) return Response.json({ error: 'Invalid request' }, { status: 400 });

  const viewer_id = await ensureViewerId();
  const rows: Record<string, unknown>[] = kind === 'search'
    ? [{ viewer_id, kind, query, result_ids: resultIds ?? [] }]
    : movies.map((m) => ({ viewer_id, kind, movie_id: m }));
  const { error } = await serviceDb().from('viewer_events').insert(rows);
  if (error) {
    console.error('events insert failed:', error);
    return Response.json({ error: 'Could not save that' }, { status: 400 }); // usually an unknown movie id
  }
  return Response.json({ ok: true });
}

export async function DELETE() {
  const viewer = await getViewerId();
  if (viewer) await clearViewer(viewer);
  return Response.json({ ok: true });
}
