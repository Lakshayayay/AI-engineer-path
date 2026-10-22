-- OpenSwap tables. Run once in the Supabase SQL editor (or apply as a migration).
-- Row Level Security (RLS) makes the database itself return only the rows whose owner is the signed-in user.

-- One row per user, created the first time they save Settings.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  preferences text not null default '' check (char_length(preferences) <= 1000),
  updated_at timestamptz not null default now()
);

-- One row per chat. user_id fills itself from the login token on insert.
create table public.conversations (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  chat_history jsonb not null default '[]'::jsonb,
  context_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The sidebar lists one user's chats, newest first. The index also speeds up the RLS check.
create index conversations_user_id_updated_at_idx on public.conversations (user_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;

-- Only signed-in users get table access. The anon role gets none.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;

-- (select auth.uid()) is read once per query, not once per row.
create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "conversations: read own" on public.conversations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "conversations: insert own" on public.conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "conversations: update own" on public.conversations
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "conversations: delete own" on public.conversations
  for delete to authenticated using ((select auth.uid()) = user_id);
