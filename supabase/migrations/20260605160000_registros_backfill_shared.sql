-- One-off backfill: restore SHARED fields (notes, week_note,
-- assigned_dow) that were lost when the pre-fix client upsert
-- clobbered them with stale local state.
--
-- Strategy: for each (week, day_key), if one athlete's row has a
-- non-null value and the other's doesn't, copy. Never overwrites
-- existing non-null values, so it's safe to re-run.

-- notes
update public.registros r
   set notes = src.notes,
       updated_at = greatest(r.updated_at, src.updated_at)
  from public.registros src
 where r.notes is null
   and src.notes is not null
   and src.week = r.week
   and src.day_key = r.day_key
   and src.athlete <> r.athlete;

-- week_note
update public.registros r
   set week_note = src.week_note,
       updated_at = greatest(r.updated_at, src.updated_at)
  from public.registros src
 where r.week_note is null
   and src.week_note is not null
   and src.week = r.week
   and src.day_key = r.day_key
   and src.athlete <> r.athlete;

-- assigned_dow
update public.registros r
   set assigned_dow = src.assigned_dow,
       updated_at = greatest(r.updated_at, src.updated_at)
  from public.registros src
 where r.assigned_dow is null
   and src.assigned_dow is not null
   and src.week = r.week
   and src.day_key = r.day_key
   and src.athlete <> r.athlete;
