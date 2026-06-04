-- Live import progress for recipe_collections. The TikTok collection
-- extractor now runs in GitHub Actions (yt-dlp doesn't fit Vercel's
-- 245 MB Python lambda cap anymore). The workflow updates these fields
-- as it streams items into the collection so the client can show a
-- progressive loader.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'collection_import_status') then
    create type collection_import_status as enum (
      'queued',     -- workflow_dispatch sent, runner not yet picked up
      'extracting', -- yt-dlp running
      'saving',     -- items being written to the row in batches
      'completed',  -- ready to use
      'failed'      -- see import_progress.message for the reason
    );
  end if;
end$$;

alter table recipe_collections
  add column if not exists import_status     collection_import_status default 'completed',
  add column if not exists import_progress   jsonb,
  add column if not exists import_started_at timestamptz;

create index if not exists recipe_collections_status_idx on recipe_collections (import_status);

-- Allow item_count to be updated incrementally by the workflow. The
-- column was added as a generated column previously; if that's the case
-- we need to drop the GENERATED constraint so the workflow can write to
-- it directly. Done idempotently so re-running the migration is safe.
do $$
declare
  v_generated boolean := false;
begin
  select coalesce(is_generated = 'ALWAYS', false)
    into v_generated
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'recipe_collections'
    and column_name = 'item_count';
  if v_generated then
    alter table recipe_collections alter column item_count drop expression;
  end if;
end$$;
