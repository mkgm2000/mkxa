-- Track meal lifecycle: prepared (cooked on Sunday) vs eaten (actually consumed).
-- Existing `done` column is kept untouched for backwards compatibility.

alter table public.meal_plan
  add column if not exists prepared boolean not null default false,
  add column if not exists eaten boolean not null default false;

create index if not exists meal_plan_prepared_unate_idx
  on public.meal_plan (week_start, prepared, eaten);
