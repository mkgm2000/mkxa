-- Thumbnail (poster image URL) + optional TikTok author for recipes.
-- Populated server-side from the TikTok oEmbed endpoint when a recipe
-- is saved with a tiktok.com source_url. Backfills lazily on first
-- card render for older rows. Both nullable: a recipe can exist
-- without a thumbnail (private video, oEmbed rate limit, manual recipe…).
alter table public.recipes
  add column if not exists thumbnail_url text,
  add column if not exists tiktok_author text;
