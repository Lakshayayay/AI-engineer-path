-- Drop the old function and table since we are changing dimensions
drop function if exists match_movies(vector(768), float, int);
drop table if exists movies;

-- Create the new table with 3072 dimensions for Gemini
create table if not exists movies (
  id bigint primary key generated always as identity,
  title text not null unique,
  release_year text not null,
  content text not null,
  -- 3072 is the dimension for Gemini embedding
  embedding vector(3072)
);

-- Create the updated function to search for movies using cosine distance
create or replace function match_movies (
  query_embedding vector(3072),
  match_threshold float, -- thhese values comes as argument values here
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
    -- DEMYSTIFYING THE MATH:
    -- 1. '<=>' is the pgvector Cosine Distance operator.
    --    Distance = 0.0 means identical angle (100% exact match).
    --    Distance = 1.0 means perpendicular (completely unrelated).
    -- 2. Similarity = 1 - (Cosine Distance).
    --    e.g., if distance is 0.1, similarity = 1 - 0.1 = 0.9 (90% match).
    1 - (movies.embedding <=> query_embedding) as similarity
  from movies
  -- FILTER: Only keep movies above the similarity threshold (e.g., > 0.5 or 50% match)
  where 1 - (movies.embedding <=> query_embedding) > match_threshold
  -- SORT: Smallest distance first (ascending) so the closest semantic matches come first
  order by (movies.embedding <=> query_embedding) asc
  -- LIMIT: Only grab the top N candidates (default 5) for context
  limit match_count;
$$;
