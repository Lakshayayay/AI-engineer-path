-- Groups wishes into conversations. Run this in the Supabase SQL editor
-- (or `supabase db push` once the CLI is linked) before deploying the
-- session-grouping change in app/page.tsx / lib/db.ts.
alter table public.wishes
  add column if not exists session_id uuid not null default gen_random_uuid();

create index if not exists wishes_user_session_idx
  on public.wishes (user_id, session_id, created_at);
