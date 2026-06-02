create table if not exists restaurants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  cuisine     text,
  location    text,
  status      text not null check (status in ('wishlist','visited')) default 'wishlist',
  added_by    text check (added_by in ('MK','Xabi')),
  rating      int check (rating between 1 and 5),
  price_tier  text check (price_tier in ('€','€€','€€€','€€€€')),
  notes       text,
  visited_at  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists restaurants_status_idx     on restaurants (status);
create index if not exists restaurants_created_at_idx on restaurants (created_at desc);

alter table restaurants enable row level security;

drop policy if exists "restaurants_all" on restaurants;
create policy "restaurants_all" on restaurants for all using (true) with check (true);

create or replace function restaurants_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists restaurants_updated_at on restaurants;
create trigger restaurants_updated_at
  before update on restaurants
  for each row execute function restaurants_set_updated_at();
