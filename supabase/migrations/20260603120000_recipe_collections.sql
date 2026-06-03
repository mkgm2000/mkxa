create table if not exists recipe_collections (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  source_url  text not null,
  source_type text not null check (source_type in ('tiktok','instagram')) default 'tiktok',
  items       jsonb not null,                       -- [{video_url, title, thumbnail, author}, ...]
  item_count  int generated always as (jsonb_array_length(items)) stored,
  cover_url   text,
  created_by  text check (created_by in ('MK','Xabi')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists recipe_collections_created_at_idx on recipe_collections (created_at desc);

alter table recipe_collections enable row level security;

drop policy if exists "recipe_collections_all" on recipe_collections;
create policy "recipe_collections_all" on recipe_collections for all using (true) with check (true);

create or replace function recipe_collections_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists recipe_collections_updated_at on recipe_collections;
create trigger recipe_collections_updated_at
  before update on recipe_collections
  for each row execute function recipe_collections_set_updated_at();

-- Link a promoted recipe back to the collection + the specific item it
-- came from so the collection detail page can show which items have
-- already been turned into recipes.
alter table recipes
  add column if not exists source_collection_id uuid references recipe_collections(id) on delete set null,
  add column if not exists source_collection_item text;

create index if not exists recipes_source_collection_idx on recipes (source_collection_id);
