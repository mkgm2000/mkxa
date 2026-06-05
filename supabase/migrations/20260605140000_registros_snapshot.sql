-- Snapshot CREATE TABLE for `registros`.
--
-- The table was originally created by hand in the Supabase dashboard
-- (pre-CI migrations). Subsequent migrations only ALTERed it. Adding
-- this idempotent CREATE so the repo is the source of truth and a
-- fresh project (e.g. staging clone) ends up with the same table.
--
-- Shape mirrors what useTraining reads/writes: per (athlete, week,
-- day_key) row, with shared fields (notes, week_note, assigned_dow)
-- duplicated across both athletes' rows by the client.

create table if not exists public.registros (
  id            serial primary key,
  athlete       text not null check (athlete in ('MK','Xabi')),
  week          int  not null check (week between 1 and 23),
  day_key       text not null check (day_key in ('D1','D2','D3','D4')),
  completed     boolean default false,
  rpe           int check (rpe is null or rpe between 1 and 10),
  notes         text,
  custom_blocks jsonb default '{}'::jsonb,
  extra_blocks  jsonb default '[]'::jsonb,
  week_note     text,
  assigned_dow  smallint check (assigned_dow is null or (assigned_dow between 0 and 6)),
  updated_at    timestamptz default now(),
  unique (athlete, week, day_key)
);

create index if not exists registros_athlete_week_idx on public.registros (athlete, week);
create index if not exists registros_week_day_idx     on public.registros (week, day_key);

alter table public.registros enable row level security;

drop policy if exists registros_all on public.registros;
create policy registros_all on public.registros for all using (true) with check (true);
