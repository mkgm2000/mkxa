-- Meal passes v2: bump to 4 passes per month and add the `kind` discriminator
-- (`dine` = went out, `delivery` = ordered in). Existing rows keep their data;
-- we only widen the idx check constraint and add the new column with a safe
-- default so previously-redeemed rows remain valid.

alter table public.meal_passes
  drop constraint if exists meal_passes_idx_check;

alter table public.meal_passes
  add constraint meal_passes_idx_check check (idx between 0 and 3);

alter table public.meal_passes
  add column if not exists kind text not null default 'dine'
    check (kind in ('dine','delivery'));
