-- Recipe images: public storage bucket + per-recipe gallery table.
-- Open RLS policies to match the existing project pattern (single tenant).

-- Public bucket so we can serve images with public URLs.
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

drop policy if exists "open recipe-images read"   on storage.objects;
drop policy if exists "open recipe-images write"  on storage.objects;
drop policy if exists "open recipe-images update" on storage.objects;
drop policy if exists "open recipe-images delete" on storage.objects;

create policy "open recipe-images read"
  on storage.objects for select
  using (bucket_id = 'recipe-images');
create policy "open recipe-images write"
  on storage.objects for insert
  with check (bucket_id = 'recipe-images');
create policy "open recipe-images update"
  on storage.objects for update
  using (bucket_id = 'recipe-images')
  with check (bucket_id = 'recipe-images');
create policy "open recipe-images delete"
  on storage.objects for delete
  using (bucket_id = 'recipe-images');

-- Gallery of extra images per recipe (primary image stays on recipes.image_url).
create table if not exists recipe_images (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists recipe_images_recipe_pos_idx
  on recipe_images (recipe_id, position);

alter table recipe_images enable row level security;

drop policy if exists recipe_images_all on recipe_images;
create policy recipe_images_all on recipe_images for all using (true) with check (true);
