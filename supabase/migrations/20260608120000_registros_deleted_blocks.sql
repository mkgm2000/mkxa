-- Track per-(athlete,week,day_key) which base-plan blocks the user removed.
-- Stores INDICES into plan_jsonb.days[k].blocks (shared between MK + Xabi
-- since they train together — mirrored client-side like notes/week_note).
-- NULL/{} means "no deletions" → render the base plan unchanged.

alter table public.registros
  add column if not exists deleted_blocks int[] default '{}'::int[];
