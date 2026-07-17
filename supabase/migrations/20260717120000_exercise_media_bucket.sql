-- Public storage bucket for vendored exercise media (gif + thumbnails).
-- Media © Gym visual — gymvisual.com. Keyed by exercise id:
--   exercise-media/gif/{id}.gif   exercise-media/thumb/{id}.jpg
-- Public = objects are readable via /storage/v1/object/public/exercise-media/...
insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do update set public = true;
