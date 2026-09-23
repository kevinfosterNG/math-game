-- Reset the shared history before introducing user profiles. Older deployed
-- builds can still read rounds from localStorage and attempt to upload them.
-- Keep a server-side cutoff so those uploads cannot recreate deleted rows.
begin;

-- Keep the former family history for an owner-only export. The browser roles
-- have no access to this schema, and repeat runs do not duplicate rows.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.legacy_rounds (like public.rounds including all);
create table if not exists private.legacy_attempts (like public.attempts including all);
revoke all on table private.legacy_rounds, private.legacy_attempts from public, anon, authenticated;
insert into private.legacy_rounds select * from public.rounds on conflict do nothing;
insert into private.legacy_attempts select * from public.attempts on conflict do nothing;

create table if not exists public.round_history_reset (
  singleton boolean primary key default true check (singleton),
  cutoff_at timestamptz not null
);

alter table public.round_history_reset enable row level security;
revoke all on table public.round_history_reset from anon, authenticated;
grant select on table public.round_history_reset to anon, authenticated;

drop policy if exists "Round history reset is readable" on public.round_history_reset;
create policy "Round history reset is readable"
  on public.round_history_reset for select to anon, authenticated using (singleton);

insert into public.round_history_reset (singleton, cutoff_at)
values (true, clock_timestamp())
on conflict (singleton) do update set cutoff_at = excluded.cutoff_at;

-- Removing a round cascades to its attempts. A transaction keeps the cutoff,
-- policy change, and deletion together if any step fails.
delete from public.rounds;

drop policy if exists "Shared rounds can be inserted" on public.rounds;
create policy "Shared rounds can be inserted"
  on public.rounds for insert to anon, authenticated
  with check (
    owner_key = 'shared'
    and completed_at >= (select cutoff_at from public.round_history_reset where singleton)
  );

drop policy if exists "Shared rounds can be updated" on public.rounds;
create policy "Shared rounds can be updated"
  on public.rounds for update to anon, authenticated
  using (owner_key = 'shared')
  with check (
    owner_key = 'shared'
    and completed_at >= (select cutoff_at from public.round_history_reset where singleton)
  );

commit;
