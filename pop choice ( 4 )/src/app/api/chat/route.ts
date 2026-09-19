import { z } from 'zod';
import { recommend } from '@/lib/recommend';

export const maxDuration = 60; // plan + retrieve + grade (+ revise loops) + pick

const Body = z.object({
  prompt: z.string().min(1).max(4000),
  excludeIds: z.array(z.number().int()).max(100).default([]),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 });

  try {
    const result = await recommend(parsed.data.prompt, parsed.data.excludeIds);
    if (!result) return Response.json({ error: "No matching movies found. You've seen everything that fits!" }, { status: 404 });
    return Response.json(result);
  } catch (error) {
    console.error('Error in chat route:', error);
    return Response.json({ error: 'Something went wrong finding your movie.' }, { status: 500 });
  }
}
