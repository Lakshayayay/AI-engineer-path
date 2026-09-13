-- Drop the old function and table since we are changing dimensions
drop function if exists match_movies(vector(1536), float, int);
drop table if exists movies;

-- Create the new table with 768 dimensions for Gemini
create table if not exists movies (
  id bigint primary key generated always as identity,
  title text not null,
  release_year text not null,
  content text not null,
  -- 768 is the dimension for Gemini's text-embedding-004
  embedding vector(768)
);

-- Create the updated function to search for movies using cosine distance
create or replace function match_movies (
  query_embedding vector(768),
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
