import { suggest } from '@/lib/movies';

// Autocomplete for the search box. Pure SQL (no AI calls), so it is cheap to call while typing.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 80) ?? '';
  if (q.length < 2) return Response.json([]);
  try {
    return Response.json(await suggest(q, 8), { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (error) {
    console.error('suggest failed:', error);
    return Response.json([], { status: 500 });
  }
}
