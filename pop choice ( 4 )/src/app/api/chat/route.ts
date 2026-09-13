import { embed, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Setup Supabase Client using secure server-side keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { prompt, excludeTitles = [] } = await req.json();

    if (!prompt) {
      return new Response('Missing prompt', { status: 400 });
    }

    // 1. Generate an embedding for the user's prompt using Gemini
    const { embedding } = await embed({
      model: google.textEmbeddingModel('gemini-embedding-001'),
      value: prompt,
    });

    // 2. Perform vector similarity search in Supabase using pgvector
    const { data: movies, error } = await supabase.rpc('match_movies', {
      query_embedding: embedding,
      match_threshold: 0.5, // Lowered slightly to ensure we get matches
      match_count: 5, // Get top 5 so we have options to exclude
    });

    if (error) {
      console.error('Supabase search error:', error);
      throw error;
    }

    // Filter out already recommended movies
    const filteredMovies = movies?.filter(
      (m: any) => !excludeTitles.includes(m.title)
    );

    const contextStr = filteredMovies
      ?.map(
        (m: any) =>
          `Title: ${m.title} (${m.release_year})\nDescription: ${m.content}\n---`
      )
      .join('\n');

    // 3. Provide instructions to the AI (System Prompt)
    const systemPrompt = `You are an expert movie recommender named Pop Choice.
You have been provided with context from a database search based on the user's preferences.
Use ONLY the provided context below to recommend the best movie to the user.
Do not recommend movies that are not in the provided context.
Provide an enthusiastic, friendly description of why this is a great fit.

CONTEXT FROM DATABASE:
${contextStr || "No matching movies found in the database. Tell the user you couldn't find a match."}`;

    // 4. Use Grok to generate a structured JSON object
    const { createOpenAI } = await import('@ai-sdk/openai');
    const xai = createOpenAI({
      baseURL: 'https://api.x.ai/v1',
      apiKey: process.env.XAI_API_KEY || '',
    });

    const { object: aiRecommendation } = await generateObject({
      model: xai('grok-beta'),
      system: systemPrompt,
      prompt: prompt,
      schema: z.object({
        title: z.string().describe("The exact title of the movie selected from context"),
        year: z.string().describe("The release year of the movie"),
        description: z.string().describe("An enthusiastic description explaining why this movie is recommended"),
      }),
    });

    // 5. Fetch the movie poster from OMDb API
    let posterUrl = "https://placehold.co/400x600/000c36/FFFFFF?text=No+Poster+Found";
    if (process.env.OMDB_API_KEY) {
      try {
        const omdbRes = await fetch(
          `https://www.omdbapi.com/?t=${encodeURIComponent(aiRecommendation.title)}&apikey=${process.env.OMDB_API_KEY}`
        );
        const omdbData = await omdbRes.json();
        if (omdbData.Poster && omdbData.Poster !== "N/A") {
          posterUrl = omdbData.Poster;
        }
      } catch (e) {
        console.error("OMDb fetch failed", e);
      }
    }

    // 6. Return the structured data to the frontend
    return new Response(
      JSON.stringify({
        ...aiRecommendation,
        posterUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
