// Corrective RAG as a LangGraph state machine:
//
//   START → planQuery → retrieveMovies → gradeResults ─ good / out of attempts ─→ pickMovie → END
//                            ▲                 │
//                            └── reviseQuery ◄─┘ (bad results: relax filters or rewrite the query)
//
// Each node returns a partial state update; `steps` accumulates so we can log the path taken.
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { embedQuery, GENRES, hybridSearch, type Candidate, type Filters } from './movies';

const fast = () => google(process.env.MODEL_FAST ?? 'gemini-3.5-flash-lite');
const smart = () => google(process.env.MODEL_SMART ?? 'gemini-3.8-flash');
const MAX_ATTEMPTS = 2; // bounded loop: at most 2 corrections, then answer with what we have

interface Plan {
  semanticQuery: string; // what the movie should feel like; goes to the vector search
  names: string[];       // actor/director/film names; goes to the keyword search
  filters: Filters;
}
type Verdict = { kind: 'good' } | { kind: 'relax' } | { kind: 'rewrite'; reason: string };

export interface Recommendation {
  id: number;
  title: string;
  year: number | null;
  description: string;
  posterUrl: string;
  watchable: boolean;
}

const State = Annotation.Root({
  prompt: Annotation<string>(),
  excludeIds: Annotation<number[]>(),
  plan: Annotation<Plan>(),
  candidates: Annotation<Candidate[]>(),
  attempts: Annotation<number>(),
  verdict: Annotation<Verdict>(),
  steps: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  result: Annotation<Recommendation | null>(),
});
type S = typeof State.State;

const PlanSchema = z.object({
  semanticQuery: z.string().describe('A short description of the mood/themes/story the group wants, without filters or names.'),
  names: z.array(z.string()).describe('ONLY proper names of actors, directors or films that appear in the request (e.g. "Tom Hanks"). Never mood or genre words. Empty array if none.'),
  genres: z.array(z.enum(GENRES)).nullable().describe('Genres, only if clearly implied.'),
  yearMin: z.number().int().nullable(),
  yearMax: z.number().int().nullable(),
  maxRuntime: z.number().int().nullable().describe('Minutes available, if the group gave a time limit.'),
  minRating: z.number().nullable().describe('IMDb rating floor, only if quality is explicitly requested.'),
});

async function planQuery(s: S): Promise<Partial<S>> {
  try {
    const { object } = await generateObject({
      model: fast(),
      schema: PlanSchema,
      system: `You turn a group's movie preferences into a search plan.
Only set a filter when the request clearly implies it ("classic" → yearMax 1980, "new" → yearMin 2010, a stated time limit → maxRuntime in minutes).
Prefer putting soft preferences (mood, themes) in semanticQuery rather than in hard filters.`,
      prompt: s.prompt,
    });
    const plan: Plan = {
      semanticQuery: object.semanticQuery || s.prompt,
      names: object.names,
      filters: {
        genres: object.genres ?? undefined,
        yearMin: object.yearMin ?? undefined,
        yearMax: object.yearMax ?? undefined,
        maxRuntime: object.maxRuntime ?? undefined,
        minRating: object.minRating ?? undefined,
      },
    };
    return { plan, attempts: 0, steps: ['plan'] };
  } catch (err) {
    console.error('plan failed, falling back to the raw prompt:', err);
    return { plan: { semanticQuery: s.prompt, names: [], filters: {} }, attempts: 0, steps: ['plan:fallback'] };
  }
}

async function retrieveMovies(s: S): Promise<Partial<S>> {
  const candidates = await hybridSearch({
    // Quoted phrases joined with OR for Postgres websearch_to_tsquery: "Tom Hanks" or "Meg Ryan". Empty = vector-only.
    queryText: s.plan.names.map((n) => `"${n.replaceAll('"', '')}"`).join(' or '),
    embedding: await embedQuery(s.plan.semanticQuery),
    filters: s.plan.filters,
    excludeIds: s.excludeIds,
    matchCount: 8,
  });
  return { candidates, steps: [`retrieve:${candidates.length}`] };
}

async function gradeResults(s: S): Promise<Partial<S>> {
  if (s.candidates.length === 0) return { verdict: { kind: 'relax' }, steps: ['grade:empty'] };
  if (s.attempts >= MAX_ATTEMPTS) return { verdict: { kind: 'good' }, steps: ['grade:skip'] };
  try {
    const { object } = await generateObject({
      model: fast(),
      schema: z.object({
        verdict: z.enum(['good', 'rewrite']),
        reason: z.string().describe('If rewrite: what is missing or off about these results.'),
      }),
      system: 'Judge whether at least one of the candidate movies is a genuinely good fit for the group request. Answer "rewrite" only if none of them fit.',
      prompt: `REQUEST:\n${s.prompt}\n\nCANDIDATES:\n${s.candidates.map((c) => `- ${c.title} (${c.year}) [${c.genres.join(', ')}]: ${c.chunk.slice(0, 200)}`).join('\n')}`,
    });
    const verdict: Verdict = object.verdict === 'good' ? { kind: 'good' } : { kind: 'rewrite', reason: object.reason };
    return { verdict, steps: [`grade:${object.verdict}`] };
  } catch (err) {
    console.error('grade failed, accepting results:', err);
    return { verdict: { kind: 'good' }, steps: ['grade:fallback'] };
  }
}

// Filters are dropped weakest-first; the time budget goes last because it's a hard constraint.
function relax(f: Filters): Filters {
  const next = { ...f };
  if (next.minRating !== undefined) delete next.minRating;
  else if (next.genres?.length) delete next.genres;
  else if (next.yearMin !== undefined || next.yearMax !== undefined) { delete next.yearMin; delete next.yearMax; }
  else delete next.maxRuntime;
  return next;
}

async function reviseQuery(s: S): Promise<Partial<S>> {
  const attempts = s.attempts + 1;
  if (s.verdict.kind === 'rewrite') {
    const { object } = await generateObject({
      model: fast(),
      schema: z.object({ semanticQuery: z.string() }),
      system: 'Rewrite the movie search description so it finds better matches, addressing the stated problem. Keep it short.',
      prompt: `REQUEST:\n${s.prompt}\n\nPREVIOUS SEARCH: ${s.plan.semanticQuery}\nPROBLEM: ${s.verdict.reason}`,
    }).catch(() => ({ object: { semanticQuery: s.plan.semanticQuery } }));
    return { attempts, plan: { ...s.plan, semanticQuery: object.semanticQuery }, steps: ['revise:rewrite'] };
  }
  return { attempts, plan: { ...s.plan, filters: relax(s.plan.filters) }, steps: ['revise:relax'] };
}

async function pickMovie(s: S): Promise<Partial<S>> {
  if (s.candidates.length === 0) return { result: null, steps: ['pick:none'] };

  const context = s.candidates
    .map((c) => `ID: ${c.id}\nTitle: ${c.title} (${c.year})\nGenres: ${c.genres.join(', ')}\nDirector: ${c.director}\nStarring: ${c.cast.join(', ')}\nRuntime: ${c.runtimeMin} min, IMDb ${c.rating}\nExcerpt: ${c.chunk}\n---`)
    .join('\n');

  let picked: { movieId: number; description: string } | null = null;
  try {
    const { object } = await generateObject({
      model: smart(),
      schema: z.object({
        movieId: z.number().int().describe('The ID of the chosen movie, copied from the context.'),
        description: z.string().describe('An enthusiastic description of why this movie fits the group.'),
      }),
      system: `You are an expert movie recommender named Pop Choice.
Use ONLY the movies in the context below and recommend the single best fit for the whole group.
Be enthusiastic and friendly, and mention what each person will enjoy.

CONTEXT FROM DATABASE:
${context}`,
      prompt: s.prompt,
    });
    picked = object;
  } catch (err) {
    console.error('pick failed, using the top candidate:', err);
  }

  // Grounding guard: the model may only choose from what retrieval returned.
  const chosen = s.candidates.find((c) => c.id === picked?.movieId) ?? s.candidates[0];
  return {
    steps: ['pick'],
    result: {
      id: chosen.id,
      title: chosen.title,
      year: chosen.year,
      description: picked && chosen.id === picked.movieId ? picked.description : `${chosen.title} looks like a great fit for your group.`,
      posterUrl: chosen.posterUrl ?? 'https://placehold.co/400x600/000c36/FFFFFF?text=No+Poster+Found',
      watchable: chosen.archiveId !== null,
    },
  };
}

const graph = new StateGraph(State)
  // Node names must differ from state keys, hence the verb-style names.
  .addNode('planQuery', planQuery)
  .addNode('retrieveMovies', retrieveMovies)
  .addNode('gradeResults', gradeResults)
  .addNode('reviseQuery', reviseQuery)
  .addNode('pickMovie', pickMovie)
  .addEdge(START, 'planQuery')
  .addEdge('planQuery', 'retrieveMovies')
  .addEdge('retrieveMovies', 'gradeResults')
  .addConditionalEdges('gradeResults', (s: S) => (s.verdict.kind === 'good' || s.attempts >= MAX_ATTEMPTS ? 'pickMovie' : 'reviseQuery'))
  .addEdge('reviseQuery', 'retrieveMovies')
  .addEdge('pickMovie', END)
  .compile();

export async function recommend(prompt: string, excludeIds: number[]) {
  const out = await graph.invoke({ prompt, excludeIds, steps: [] });
  console.log('recommend path:', out.steps.join(' → '));
  return out.result ?? null;
}
