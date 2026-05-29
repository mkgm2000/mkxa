create table if not exists athlete_profiles (
  athlete    text primary key check (athlete in ('MK','Xabi')),
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table athlete_profiles enable row level security;

drop policy if exists "athlete_profiles_all" on athlete_profiles;
create policy "athlete_profiles_all" on athlete_profiles for all using (true) with check (true);

create or replace function set_athlete_profiles_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists athlete_profiles_updated_at on athlete_profiles;
create trigger athlete_profiles_updated_at
  before update on athlete_profiles
  for each row execute function set_athlete_profiles_updated_at();

insert into athlete_profiles (athlete) values ('MK'), ('Xabi')
  on conflict (athlete) do nothing;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatars_select" on storage.objects;
create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_write" on storage.objects;
create policy "avatars_write" on storage.objects
  for all using (bucket_id = 'avatars') with check (bucket_id = 'avatars');
