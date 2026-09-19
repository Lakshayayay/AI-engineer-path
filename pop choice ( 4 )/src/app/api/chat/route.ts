import { z } from 'zod';
import { recommend } from '@/lib/recommend';
import { moviesByIds } from '@/lib/movies';
import { getSignals, getViewerId } from '@/lib/viewer';

export const maxDuration = 60; // plan + retrieve + grade (+ revise loops) + pick

const Body = z.object({
  prompt: z.string().min(1).max(4000),
  excludeIds: z.array(z.number().int()).max(100).default([]),
  personal: z.boolean().default(false), // PopStream: tune the pick to this viewer's taste. The group quiz leaves it off.
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 });

  try {
    let { prompt, excludeIds } = parsed.data;
    if (parsed.data.personal) {
      const signals = await getSignals(await getViewerId());
      const liked = await moviesByIds(signals.liked.slice(0, 6));
      if (liked.length) prompt += `\n\n(Context, not part of the request: this viewer has enjoyed ${liked.map((m) => m.title).join(', ')}.)`;
      excludeIds = [...new Set([...excludeIds, ...signals.played])];
    }
    const result = await recommend(prompt, excludeIds);
    if (!result) return Response.json({ error: "No matching movies found. You've seen everything that fits!" }, { status: 404 });
    return Response.json(result);
  } catch (error) {
    console.error('Error in chat route:', error);
    return Response.json({ error: 'Something went wrong finding your movie.' }, { status: 500 });
  }
}
