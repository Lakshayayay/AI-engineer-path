-- PopStream v3: people/studio search with typo tolerance, plain-words facts, and an anonymous taste profile.

create extension if not exists pg_trgm with schema extensions;

-- ---------- catalogue enrichment ----------
alter table movies
  add column awards    text,
  add column countries text[] not null default '{}',
  add column languages text[] not null default '{}',
  add column tags      text[] not null default '{}';   -- Wikidata topics: main subject, setting, "based on"

create index movies_title_trgm_idx on movies using gin (title extensions.gin_trgm_ops);

-- Cast and crew. One row per (film, role, person); billing = order in the cast list.
create table credits (
  movie_id bigint not null references movies(id) on delete cascade,
  name     text   not null,
  role     text   not null check (role in ('actor', 'director', 'writer', 'composer', 'cinematographer', 'studio')),
  billing  int,
  primary key (movie_id, role, name)
);
create index credits_name_trgm_idx on credits using gin (name extensions.gin_trgm_ops);
create index credits_name_idx      on credits (name);

alter table credits enable row level security;
create policy "credits are public" on credits for select using (true);

-- The "facts" chunk (cast, crew, studio, awards...) is matched by keyword only, so it needs no embedding.
alter table movie_chunks drop constraint movie_chunks_kind_check;
alter table movie_chunks add constraint movie_chunks_kind_check check (kind in ('profile', 'plot', 'reception', 'facts'));
alter table movie_chunks alter column embedding drop not null;
alter table movie_chunks add constraint movie_chunks_embedding_check check (kind = 'facts' or embedding is not null);

-- ---------- anonymous taste profile ----------
-- viewer_id is a random id in a cookie: no account, no personal data.
-- RLS is on with NO policies, so only the server's service-role key can read or write it.
create table viewer_events (
  id         bigint primary key generated always as identity,
  viewer_id  uuid not null,
  kind       text not null check (kind in ('search', 'play', 'like', 'dislike', 'unrate')),
  movie_id   bigint references movies(id) on delete cascade,
  query      text,
  result_ids bigint[],
  created_at timestamptz not null default now()
);
create index viewer_events_viewer_idx on viewer_events (viewer_id, created_at desc);
create index viewer_events_movie_idx  on viewer_events (movie_id);
alter table viewer_events enable row level security;

-- ---------- functions ----------
-- Autocomplete: titles plus people/studios. word_similarity(q, x) is high when q resembles ANY part of x,
-- so both "hanks" and the typo "tom hnaks" find Tom Hanks.
create or replace function suggest (q text, n int default 6)
returns table (kind text, label text, main_role text, films int, movie_id bigint, poster_url text, score real)
language sql stable
set search_path = public, extensions
as $$
  with titles as (
    select 'title'::text as kind, m.title as label, null::text as main_role, 1 as films, m.id as movie_id, m.poster_url,
           (greatest(word_similarity(q, m.title), similarity(q, m.title)) + 0.2 * similarity(q, m.title)
            + case when m.title ilike q || '%' then 0.3 else 0 end)::real as score
    from movies m
  ),
  people as (
    select case when mode() within group (order by c.role) = 'studio' then 'studio' else 'person' end as kind,
           c.name as label,
           mode() within group (order by c.role) as main_role,
           count(distinct c.movie_id)::int as films,
           null::bigint as movie_id, null::text as poster_url,
           (greatest(word_similarity(q, c.name), similarity(q, c.name)) + 0.2 * similarity(q, c.name)
            + case when c.name ilike '%' || q || '%' then 0.2 else 0 end)::real as score
    from credits c
    group by c.name
  )
  select * from (select * from titles union all select * from people) u
  where score >= 0.35
  order by score desc, films desc
  limit n;
$$;

-- Which credited person/studio explains why each result matched the query ("With Tom Hanks", "From Pixar").
-- word_similarity(name, q) is high when the whole name appears inside the query text.
create or replace function credit_matches (q text, ids bigint[])
returns table (movie_id bigint, name text, role text)
language sql stable
set search_path = public, extensions
as $$
  select distinct on (c.movie_id) c.movie_id, c.name, c.role
  from credits c
  where c.movie_id = any(ids) and word_similarity(c.name, q) >= 0.8
  order by c.movie_id, word_similarity(c.name, q) desc, c.billing nulls last;
$$;

-- Average the profile embedding of what the viewer likes/plays (latest 30), minus half the average of dislikes.
create or replace function taste_vector (viewer uuid)
returns vector(768)
language sql stable
set search_path = public, extensions
as $$
  with rated as (
    select distinct on (movie_id) movie_id, kind
    from viewer_events
    where viewer_id = viewer and kind in ('like', 'dislike', 'unrate') and movie_id is not null
    order by movie_id, created_at desc
  ),
  pos as (
    select movie_id, max(t) as t from (
      select movie_id, created_at as t from viewer_events where viewer_id = viewer and kind = 'play' and movie_id is not null
      union all
      select r.movie_id, now() from rated r where r.kind = 'like'
    ) x
    where movie_id not in (select movie_id from rated where kind = 'dislike')
    group by movie_id
    order by max(t) desc
    limit 30
  ),
  p as (select avg(c.embedding) as v from pos join movie_chunks c on c.movie_id = pos.movie_id and c.chunk_index = 0),
  neg as (
    select avg(c.embedding) as v
    from rated r join movie_chunks c on c.movie_id = r.movie_id and c.chunk_index = 0
    where r.kind = 'dislike'
  )
  select case
    when p.v is null then null
    when neg.v is null then p.v
    else p.v - neg.v * array_fill(0.5::real, array[768])::vector
  end
  from p, neg;
$$;

-- "Top picks for you": nearest films to the taste vector that the viewer hasn't liked, played or disliked.
create or replace function taste_picks (viewer uuid, n int default 12)
returns table (movie_id bigint, title text, release_year int, poster_url text, archive_id text)
language sql stable
set search_path = public, extensions
as $$
  with tv as (select taste_vector(viewer) as v),
  seen as (
    select movie_id from viewer_events
    where viewer_id = viewer and kind in ('like', 'dislike', 'play') and movie_id is not null
  )
  select m.id, m.title, m.release_year, m.poster_url, m.archive_id
  from tv, movie_chunks c
  join movies m on m.id = c.movie_id
  where tv.v is not null and c.chunk_index = 0 and m.id not in (select movie_id from seen)
  order by c.embedding <=> tv.v
  limit n;
$$;

-- hybrid_search v2: adds the keyword-only facts chunk, "why" flags, and optional personalization.
-- The signature changes (new column + parameter), so drop the old one first.
drop function if exists hybrid_search (text, vector, int, text[], int, int, int, numeric, bigint[], boolean);

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
  only_watchable  boolean default false,
  viewer_id       uuid    default null
)
returns table (
  movie_id      bigint,
  title         text,
  release_year  int,
  genres        text[],
  runtime_min   int,
  rating        numeric,
  director      text,
  cast_names    text[],
  poster_url    text,
  archive_id    text,
  chunk_content text,
  score         double precision,
  chunk_kind    text,
  via_meaning   boolean,
  via_keywords  boolean,
  via_taste     boolean
)
language sql stable
set search_path = public, extensions
set hnsw.ef_search = 200
set hnsw.iterative_scan = 'relaxed_order'
as $$
  with ok as (
    select m.id from movies m
    where (filter_genres is null or m.genres && filter_genres)
      and (year_min is null or m.release_year >= year_min)
      and (year_max is null or m.release_year <= year_max)
      and (max_runtime is null or m.runtime_min <= max_runtime)
      and (min_rating is null or m.rating >= min_rating)
      and not (m.id = any(exclude_ids))
      and (not only_watchable or m.archive_id is not null)
  ),
  vec as (
    select c.id as chunk_id, c.movie_id, 'v'::text as src,
           row_number() over (order by c.embedding <=> query_embedding) as rnk
    from movie_chunks c
    where c.kind <> 'facts' and c.movie_id in (select id from ok)
    order by c.embedding <=> query_embedding
    limit 40
  ),
  kw as (
    select c.id as chunk_id, c.movie_id, 'k'::text as src,
           row_number() over (order by ts_rank_cd(c.fts, q.tsq) desc) as rnk
    from movie_chunks c, websearch_to_tsquery('english', query_text) as q(tsq)
    where c.fts @@ q.tsq and c.movie_id in (select id from ok)
    order by ts_rank_cd(c.fts, q.tsq) desc
    limit 40
  ),
  fused as (
    select chunk_id, movie_id, sum(1.0 / (60 + rnk)) as score,
           bool_or(src = 'v') as via_meaning, bool_or(src = 'k') as via_keywords
    from (select * from vec union all select * from kw) u
    group by chunk_id, movie_id
  ),
  per_movie as (
    select movie_id, sum(score) as movie_score, bool_or(via_meaning) as via_meaning, bool_or(via_keywords) as via_keywords
    from fused group by movie_id
  ),
  -- Personalization only re-orders films that are already relevant: a third RRF list, at half weight,
  -- ranks the retrieved candidates by closeness to the taste vector.
  tv as (select case when viewer_id is null then null else taste_vector(viewer_id) end as v),
  taste as (
    select p.movie_id,
           row_number() over (order by c.embedding <=> tv.v) as rnk
    from per_movie p
    join movie_chunks c on c.movie_id = p.movie_id and c.chunk_index = 0, tv
    where tv.v is not null
  ),
  scored as (
    select p.movie_id, p.movie_score + coalesce(0.5 / (60 + t.rnk), 0) as total,
           p.via_meaning, p.via_keywords, coalesce(t.rnk <= 5, false) as via_taste
    from per_movie p left join taste t on t.movie_id = p.movie_id
  ),
  best as (
    select distinct on (f.movie_id) f.movie_id, f.chunk_id
    from fused f order by f.movie_id, f.score desc
  )
  select m.id, m.title, m.release_year, m.genres, m.runtime_min, m.rating, m.director,
         m.cast_names, m.poster_url, m.archive_id, c.content, s.total::double precision,
         c.kind, s.via_meaning, s.via_keywords, s.via_taste
  from scored s
  join movies m on m.id = s.movie_id
  join best b on b.movie_id = s.movie_id
  join movie_chunks c on c.id = b.chunk_id
  order by s.total desc
  limit match_count;
$$;
