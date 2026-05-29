-- Meal passes: 3 monthly "eat-out" tickets shared by MK + Xabi.
-- Reset implicitly each month by inserting fresh rows keyed by month_key.

create table if not exists public.meal_passes (
  id           uuid primary key default gen_random_uuid(),
  month_key    text not null,                                 -- 'YYYY-MM'
  idx          int not null check (idx between 0 and 2),
  redeemed     boolean not null default false,
  redeemed_at  timestamptz,
  place        text,
  note         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (month_key, idx)
);

alter table public.meal_passes enable row level security;
drop policy if exists "meal_passes_all" on public.meal_passes;
create policy "meal_passes_all" on public.meal_passes
  for all using (true) with check (true);

create or replace function public.meal_passes_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists meal_passes_touch_trg on public.meal_passes;
create trigger meal_passes_touch_trg before update on public.meal_passes
for each row execute function public.meal_passes_touch();
