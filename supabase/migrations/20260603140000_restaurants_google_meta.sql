-- Restaurants now carry the Google Places metadata we capture when MK or
-- Xabi pick a restaurant from the search sheet. We only store IDs + URLs
-- + the chosen photo reference (proxied on render); no PII.

alter table restaurants
  add column if not exists image_url       text,
  add column if not exists google_place_id text,
  add column if not exists maps_url        text,
  add column if not exists website         text;

create index if not exists restaurants_google_place_id_idx on restaurants (google_place_id);
