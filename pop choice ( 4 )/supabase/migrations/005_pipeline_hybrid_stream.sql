-- Pop Choice v2: pipeline-loaded catalog, chunked embeddings, hybrid search.
-- Replaces the 15-row demo table from migration 004; the pipeline re-ingests everything.

create extension if not exists vector;

drop function if exists match_movies(vector(3072), float, int);
drop table if exists movies cascade;

-- One row per film: structured facts you can filter on exactly.
create table movies (
  id            bigint primary key generated always as identity,
  imdb_id       text not null unique,
  wikidata_id   text,
  title         text not null,
  release_year  int,
  genres        text[] not null default '{}',
  runtime_min   int,
  rated         text,
  rating        numeric(3,1),
  director      text,
  cast_names    text[] not null default '{}',
  overview      text,
  poster_url    text,
  wiki_url      text,
  archive_id    text,            -- Internet Archive identifier; null = not free to watch in-app
  popularity    int not null default 0  -- Wikidata sitelink count, a cheap fame proxy
);

create index movies_genres_idx   on movies using gin (genres);
create index movies_year_idx     on movies (release_year);
create index movies_rating_idx   on movies (rating);
create index movies_watchable_idx on movies (popularity desc) where archive_id is not null;

-- Many rows per film: text chunks, each with its own embedding + keyword index.
-- 768 dims (Gemini truncated output) because pgvector's HNSW index caps at 2000 dims.
create table movie_chunks (
  id            bigint primary key generated always as identity,
  movie_id      bigint not null references movies(id) on delete cascade,
  chunk_index   int not null,
  kind          text not null check (kind in ('profile', 'plot', 'reception')),
  content       text not null,
  content_hash  text not null,
  embedding     vector(768) not null,
  fts           tsvector generated always as (to_tsvector('english', content)) stored,
  unique (movie_id, chunk_index)
);

create index movie_chunks_embedding_idx on movie_chunks using hnsw (embedding vector_cosine_ops);
create index movie_chunks_fts_idx       on movie_chunks using gin (fts);

-- Watchmode "where to watch" cache (free-tier terms: refresh after 30 days).
create table watch_sources (
  movie_id    bigint primary key references movies(id) on delete cascade,
  region      text not null,
  sources     jsonb not null default '[]',
  trailer_url text,
  fetched_at  timestamptz not null default now()
);

-- RLS: the catalog is public-read; watch_sources has no policy, so only the service role touches it.
alter table movies        enable row level security;
alter table movie_chunks  enable row level security;
alter table watch_sources enable row level security;

create policy "catalog is public" on movies       for select using (true);
create policy "chunks are public" on movie_chunks for select using (true);

-- Hybrid search: vector top-40 + keyword top-40, merged with Reciprocal Rank Fusion (RRF),
-- collapsed to one row per movie. RRF score = sum of 1/(60 + rank) across both rankings,
-- so a chunk that ranks well in EITHER list (or both) floats to the top without having to
-- compare cosine similarity against ts_rank on a common scale.
create or replace function hybrid_search (
  query_text      text,
  query_embedding vector(768),
  match_count     int     default 8,
  filter_genres   text[]  default null,
  year_min        int     default null,
  year_max        int     default null,
  max_runtime     int     default null,
  min_rating      numeric default null,
  exclude_ids     bigint[] default '{}',
  only_watchable  boolean default false
)
returns table (
  movie_id     bigint,
  title        text,
  release_year int,
  genres       text[],
  runtime_min  int,
  rating       numeric,
  director     text,
  cast_names   text[],
  poster_url   text,
  archive_id   text,
  chunk_content text,
  score        double precision
)
language sql stable
set search_path = public, extensions
-- Filtered HNSW scans can return fewer rows than asked for; these let pgvector keep scanning.
set hnsw.ef_search = 200
set hnsw.iterative_scan = 'relaxed_order'
as $$
  with vec as (
    select c.id as chunk_id, c.movie_id,
           row_number() over (order by c.embedding <=> query_embedding) as rnk
    from movie_chunks c
    join movies m on m.id = c.movie_id
    where (filter_genres is null or m.genres && filter_genres)
      and (year_min is null or m.release_year >= year_min)
      and (year_max is null or m.release_year <= year_max)
      and (max_runtime is null or m.runtime_min <= max_runtime)
      and (min_rating is null or m.rating >= min_rating)
      and not (m.id = any(exclude_ids))
      and (not only_watchable or m.archive_id is not null)
    order by c.embedding <=> query_embedding
    limit 40
  ),
  kw as (
    select c.id as chunk_id, c.movie_id,
           row_number() over (order by ts_rank_cd(c.fts, q.tsq) desc) as rnk
    from movie_chunks c
    join movies m on m.id = c.movie_id,
         websearch_to_tsquery('english', query_text) as q(tsq)
    where c.fts @@ q.tsq
      and (filter_genres is null or m.genres && filter_genres)
      and (year_min is null or m.release_year >= year_min)
      and (year_max is null or m.release_year <= year_max)
      and (max_runtime is null or m.runtime_min <= max_runtime)
      and (min_rating is null or m.rating >= min_rating)
      and not (m.id = any(exclude_ids))
      and (not only_watchable or m.archive_id is not null)
    order by ts_rank_cd(c.fts, q.tsq) desc
    limit 40
  ),
  fused as (
    select chunk_id, movie_id, sum(1.0 / (60 + rnk)) as score
    from (select * from vec union all select * from kw) u
    group by chunk_id, movie_id
  ),
  ranked as (
    select chunk_id, movie_id, score,
           sum(score) over (partition by movie_id) as movie_score,
           row_number() over (partition by movie_id order by score desc) as rn
    from fused
  )
  select m.id, m.title, m.release_year, m.genres, m.runtime_min, m.rating, m.director,
         m.cast_names, m.poster_url, m.archive_id, c.content, r.movie_score::double precision
  from ranked r
  join movies m on m.id = r.movie_id
  join movie_chunks c on c.id = r.chunk_id
  where r.rn = 1
  order by r.movie_score desc
  limit match_count;
$$;

-- "More like this": nearest profile chunks (chunk_index 0) to the target film's profile chunk.
create or replace function similar_movies (
  target_id   bigint,
  match_count int default 12
)
returns table (
  movie_id     bigint,
  title        text,
  release_year int,
  poster_url   text,
  archive_id   text
)
language sql stable
set search_path = public, extensions
as $$
  select m.id, m.title, m.release_year, m.poster_url, m.archive_id
  from movie_chunks t
  join movie_chunks c on c.chunk_index = 0 and c.movie_id <> t.movie_id
  join movies m on m.id = c.movie_id
  where t.movie_id = target_id and t.chunk_index = 0
  order by c.embedding <=> t.embedding
  limit match_count;
$$;
