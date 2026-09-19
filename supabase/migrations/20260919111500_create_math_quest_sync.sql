-- Math Quest's intentionally shared cloud history. Apply with `supabase db push`
-- after linking the project. Every visitor uses the single owner dataset.

create table if not exists public.rounds (
  id uuid primary key,
  owner_key text not null default 'shared' check (owner_key = 'shared'),
  completed_at timestamptz not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'expert')),
  total_questions smallint not null check (total_questions between 1 and 25),
  correct_answers smallint not null check (correct_answers between 0 and total_questions),
  percentage smallint not null check (percentage between 0 and 100),
  active_time_ms integer not null check (active_time_ms >= 0),
  average_time_ms integer not null check (average_time_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists rounds_owner_completed_at_idx on public.rounds (owner_key, completed_at desc);

create table if not exists public.attempts (
  round_id uuid not null references public.rounds (id) on delete cascade,
  question_id text not null,
  order_index smallint not null check (order_index between 0 and 24),
  fact_x smallint not null check (fact_x between 1 and 12),
  fact_y smallint not null check (fact_y between 1 and 12),
  displayed_x smallint not null check (displayed_x between 1 and 12),
  displayed_y smallint not null check (displayed_y between 1 and 12),
  entered_answer smallint not null check (entered_answer between 0 and 999),
  correct_answer smallint not null check (correct_answer between 1 and 144),
  is_correct boolean not null,
  response_time_ms integer not null check (response_time_ms >= 0),
  primary key (round_id, question_id),
  unique (round_id, order_index)
);

alter table public.rounds enable row level security;
alter table public.attempts enable row level security;

-- A publishable key cannot prove ownership. These tables are intentionally a
-- single public dataset: anonymous clients can read and upsert, but not delete.
revoke all on table public.rounds, public.attempts from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.rounds, public.attempts to anon, authenticated;

create policy "Shared rounds are readable"
  on public.rounds for select to anon, authenticated using (owner_key = 'shared');
create policy "Shared rounds can be inserted"
  on public.rounds for insert to anon, authenticated with check (owner_key = 'shared');
create policy "Shared rounds can be updated"
  on public.rounds for update to anon, authenticated
  using (owner_key = 'shared') with check (owner_key = 'shared');

create policy "Shared attempts are readable"
  on public.attempts for select to anon, authenticated using (true);
create policy "Shared attempts can be inserted"
  on public.attempts for insert to anon, authenticated
  with check (exists (select 1 from public.rounds where rounds.id = attempts.round_id and rounds.owner_key = 'shared'));
create policy "Shared attempts can be updated"
  on public.attempts for update to anon, authenticated
  using (true)
  with check (exists (select 1 from public.rounds where rounds.id = attempts.round_id and rounds.owner_key = 'shared'));
