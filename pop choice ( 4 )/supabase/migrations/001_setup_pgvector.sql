-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your movies
create table if not exists movies (
  id bigint primary key generated always as identity,
  title text not null,
  release_year text not null,
  content text not null,
  -- 1536 is the default dimension for OpenAI's text-embedding-3-small and text-embedding-ada-002
  embedding vector(1536)
);

-- Create a function to search for movies using cosine distance
create or replace function match_movies (
  query_embedding vector(1536),
  match_threshold float,
  match_count int default 5
)
returns table (
  id bigint,
  title text,
  release_year text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    movies.id,
    movies.title,
    movies.release_year,
    movies.content,
    1 - (movies.embedding <=> query_embedding) as similarity
  from movies
  where 1 - (movies.embedding <=> query_embedding) > match_threshold
  order by (movies.embedding <=> query_embedding) asc
  limit match_count;
$$;
