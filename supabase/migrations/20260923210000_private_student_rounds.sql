-- Replace the old shared game dataset with private, Google-authenticated
-- player histories. The earlier reset archives shared history in private.*.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.legacy_rounds (like public.rounds including all);
create table if not exists private.legacy_attempts (like public.attempts including all);
revoke all on table private.legacy_rounds, private.legacy_attempts from public, anon, authenticated;

-- Catch any rounds written by a still-open old client after the reset.
insert into private.legacy_rounds select * from public.rounds on conflict do nothing;
insert into private.legacy_attempts select * from public.attempts on conflict do nothing;
delete from public.rounds;

drop policy if exists "Shared rounds are readable" on public.rounds;
drop policy if exists "Shared rounds can be inserted" on public.rounds;
drop policy if exists "Shared rounds can be updated" on public.rounds;
drop policy if exists "Shared attempts are readable" on public.attempts;
drop policy if exists "Shared attempts can be inserted" on public.attempts;
drop policy if exists "Shared attempts can be updated" on public.attempts;

drop index if exists public.rounds_owner_completed_at_idx;
alter table public.rounds drop column owner_key;
alter table public.rounds
  add column user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade;
create index rounds_user_completed_at_idx on public.rounds (user_id, completed_at desc);

revoke all on table public.rounds, public.attempts from anon, authenticated;
grant select, insert, update on table public.rounds, public.attempts to authenticated;

create policy "Players read own rounds"
  on public.rounds for select to authenticated
  using (auth.uid() is not null and user_id = auth.uid());
create policy "Players insert own rounds"
  on public.rounds for insert to authenticated
  with check (auth.uid() is not null and user_id = auth.uid());
create policy "Players update own rounds"
  on public.rounds for update to authenticated
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "Players read own attempts"
  on public.attempts for select to authenticated
  using (exists (
    select 1 from public.rounds
    where rounds.id = attempts.round_id and rounds.user_id = auth.uid()
  ));
create policy "Players insert own attempts"
  on public.attempts for insert to authenticated
  with check (exists (
    select 1 from public.rounds
    where rounds.id = attempts.round_id and rounds.user_id = auth.uid()
  ));
create policy "Players update own attempts"
  on public.attempts for update to authenticated
  using (exists (
    select 1 from public.rounds
    where rounds.id = attempts.round_id and rounds.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.rounds
    where rounds.id = attempts.round_id and rounds.user_id = auth.uid()
  ));

-- The reset marker is no longer needed by clients.
revoke all on table public.round_history_reset from anon, authenticated;
drop policy if exists "Round history reset is readable" on public.round_history_reset;

commit;
