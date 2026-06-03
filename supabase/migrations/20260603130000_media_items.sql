-- Pelis + series que MK y Xabi quieren ver / han visto. Mismo patrón
-- que restaurants: open RLS, status wishlist|seen, added_by atribución.
-- tmdb_id + media_type forman la identidad lógica (un mismo film no se
-- duplica entre los dos).

create table if not exists media_items (
  id              uuid primary key default gen_random_uuid(),
  tmdb_id         integer not null,
  media_type      text    not null check (media_type in ('movie', 'tv')),
  title           text    not null,
  original_title  text,
  overview        text,
  poster_path     text,                       -- /xyz.jpg (relativa al CDN)
  backdrop_path   text,
  release_date    text,                       -- YYYY-MM-DD (raw de TMDB)
  vote_average    numeric(3,1),
  runtime_minutes integer,
  providers       text[]  not null default '{}',  -- ['netflix','prime','disney','hbo','other']
  genres          text[]  not null default '{}',
  status          text    not null default 'wishlist' check (status in ('wishlist', 'seen')),
  added_by        text    check (added_by in ('MK', 'Xabi')),
  rating_mk       integer check (rating_mk between 1 and 10),
  rating_xabi     integer check (rating_xabi between 1 and 10),
  notes           text,
  watched_at      date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tmdb_id, media_type)
);

create index if not exists media_items_status_idx     on media_items (status);
create index if not exists media_items_added_by_idx   on media_items (added_by);
create index if not exists media_items_providers_idx  on media_items using gin (providers);

-- Open RLS (sólo MK + Xabi usan la app, ya gestionado en lib/auth).
alter table media_items enable row level security;
drop policy if exists "media_items all" on media_items;
create policy "media_items all" on media_items for all using (true) with check (true);

-- updated_at touch trigger (reutiliza la función global si existe).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists media_items_updated_at on media_items;
    create trigger media_items_updated_at before update on media_items
      for each row execute function set_updated_at();
  end if;
end$$;
