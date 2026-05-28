-- Meals: recipes, ingredients, steps, weekly meal_plan.
-- RLS: open policies to match the existing project pattern (risk explicitly accepted).

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  source_type text check (source_type in ('tiktok','manual','instagram','web','other')),
  image_url text,
  prep_minutes int,
  servings int default 2,
  tags text[] default '{}',
  notes text,
  created_by text check (created_by in ('MK','Xabi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recipes_created_at_idx on recipes (created_at desc);
create index if not exists recipes_tags_idx on recipes using gin (tags);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  aisle text check (aisle in (
    'frutas_verduras','pescaderia','carniceria','lacteos',
    'panaderia','despensa','congelados','bebidas','limpieza','otros'
  )) default 'otros',
  optional bool default false,
  position int default 0
);
create index if not exists recipe_ingredients_recipe_idx on recipe_ingredients(recipe_id);

create table if not exists recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  position int not null,
  body text not null,
  timer_min int,
  unique(recipe_id, position)
);
create index if not exists recipe_steps_recipe_idx on recipe_steps(recipe_id);

create table if not exists meal_plan (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  day text not null check (day in ('mon','tue','wed','thu','fri','sat','sun')),
  slot text not null check (slot in ('breakfast','lunch','dinner','snack')),
  recipe_id uuid references recipes(id) on delete set null,
  servings int default 2,
  done bool default false,
  unique(week_start, day, slot)
);
create index if not exists meal_plan_week_idx on meal_plan(week_start);

-- Reuse trigger function set_updated_at if it already exists; otherwise create.
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists recipes_updated_at on recipes;
create trigger recipes_updated_at
  before update on recipes
  for each row execute function set_updated_at();

alter table recipes             enable row level security;
alter table recipe_ingredients  enable row level security;
alter table recipe_steps        enable row level security;
alter table meal_plan           enable row level security;

drop policy if exists recipes_all on recipes;
create policy recipes_all on recipes for all using (true) with check (true);
drop policy if exists recipe_ingredients_all on recipe_ingredients;
create policy recipe_ingredients_all on recipe_ingredients for all using (true) with check (true);
drop policy if exists recipe_steps_all on recipe_steps;
create policy recipe_steps_all on recipe_steps for all using (true) with check (true);
drop policy if exists meal_plan_all on meal_plan;
create policy meal_plan_all on meal_plan for all using (true) with check (true);
