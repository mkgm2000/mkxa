-- Shopping list + pantry. RLS open per project convention.

create table if not exists pantry_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  aisle text not null,
  in_stock bool default true,
  updated_at timestamptz not null default now()
);
create index if not exists pantry_items_aisle_idx on pantry_items(aisle);

create table if not exists shopping_list (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  name text not null,
  quantity numeric,
  unit text,
  aisle text not null,
  source text check (source in ('plan','manual')) default 'plan',
  recipe_ids uuid[] default '{}',
  checked bool default false,
  archived bool default false,
  position int default 0,
  created_at timestamptz not null default now()
);
create index if not exists shopping_list_week_idx on shopping_list(week_start, archived);

alter table pantry_items   enable row level security;
alter table shopping_list  enable row level security;

drop policy if exists pantry_items_all on pantry_items;
create policy pantry_items_all on pantry_items for all using (true) with check (true);
drop policy if exists shopping_list_all on shopping_list;
create policy shopping_list_all on shopping_list for all using (true) with check (true);
