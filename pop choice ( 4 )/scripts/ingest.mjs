import { createClient } from '@supabase/supabase-js';
import { embed } from 'ai';
import { google } from '@ai-sdk/google';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables from .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Import the movies data
import movies from '../content.js';

async function main() {
  console.log(`Starting ingestion of ${movies.length} movies...`);

  // Generate embeddings for all movies based on their content
  // We use the raw text content to capture the semantic meaning of the movie
  const contents = movies.map((m) => m.content);

  console.log('Generating embeddings via Gemini...');
  const embeddings = [];
  for (const content of contents) {
    const { embedding } = await embed({
      model: google.textEmbeddingModel('gemini-embedding-001'),
      value: content,
    });
    embeddings.push(embedding);
  }

  console.log('Embeddings generated. Inserting into Supabase...');

  // Prepare the rows for insertion
  const rows = movies.map((movie, i) => ({
    title: movie.title,
    release_year: movie.releaseYear,
    content: movie.content,
    embedding: embeddings[i],
  }));

  const { error } = await supabase
    .from('movies')
    .upsert(rows, { onConflict: 'title' }); // Basic upsert to avoid duplicates

  if (error) {
    console.error('Error inserting into Supabase:', error);
  } else {
    console.log('Successfully inserted movies with embeddings into Supabase!');
  }
}

main().catch(console.error);
