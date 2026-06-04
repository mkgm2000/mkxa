-- Enable Supabase Realtime on shopping_list so the supermarket view
-- can sync between MK and Xabi without manual refresh.
-- Uses do-block because `alter publication ... add table` does not
-- support `if not exists` directly.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shopping_list'
  ) then
    execute 'alter publication supabase_realtime add table public.shopping_list';
  end if;
end $$;

-- Ensure UPDATE/DELETE payloads carry the full row so client-side
-- dedup-by-id and surgical patching work without extra refetches.
alter table public.shopping_list replica identity full;
