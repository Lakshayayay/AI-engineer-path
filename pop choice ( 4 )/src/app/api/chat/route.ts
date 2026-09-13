import { embed, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client using secure server-side keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Force the edge runtime if desired, but node runtime is fine too
// export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // 1. Extract messages from the request body
    // The Vercel AI SDK 'useChat' hook automatically sends a 'messages' array
    const { messages } = await req.json();

    // 2. Get the latest message (the user's prompt)
    const latestMessage = messages[messages.length - 1]?.content;

    if (!latestMessage) {
      return new Response('Missing message', { status: 400 });
    }

    // 3. Generate an embedding for the user's prompt
    // This converts the text into a vector so we can search the database
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: latestMessage,
    });

    // 4. Perform vector similarity search in Supabase using pgvector
    const { data: movies, error } = await supabase.rpc('match_movies', {
      query_embedding: embedding,
      match_threshold: 0.7, // Adjust threshold based on testing
      match_count: 3, // Get top 3 closest matches
    });

    if (error) {
      console.error('Supabase search error:', error);
      throw error;
    }

    // 5. Construct the context string from our database results
    const contextStr = movies
      ?.map(
        (m: any) =>
          `Title: ${m.title} (${m.release_year})\nDescription: ${m.content}\n---`
      )
      .join('\n');

    // 6. Provide instructions to the AI (System Prompt)
    const systemPrompt = `You are an expert movie recommender named Pop Choice.
You have been provided with context from a database search based on the user's preferences.
Use ONLY the provided context below to recommend the best movie to the user.
If none of the context movies seem like a good fit, explain why based on the context, but still recommend one of them.
Do not recommend movies that are not in the provided context.
Be enthusiastic, friendly, and structure your response nicely.

CONTEXT FROM DATABASE:
${contextStr || "No matching movies found in the database."}`;

    // 7. Stream the response back to the client using the Chat Completion model
    // You can switch this to Groq or any other provider easily!
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: messages,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
