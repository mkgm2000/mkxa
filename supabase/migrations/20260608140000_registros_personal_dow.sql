-- Per-athlete weekday override that does NOT mirror to the partner.
--
-- Default model (assigned_dow) treats the day-of-week as shared between
-- MK and Xabi — they train together. When one of them wants to do a
-- specific session on a different weekday (work conflict, race travel,
-- etc.) without dragging the partner along, the client writes the new
-- dow to assigned_dow_personal on THAT athlete's row only.
--
-- Effective dow at render time = assigned_dow_personal ?? shared
-- (where shared = latest non-null assigned_dow across both rows).

alter table public.registros
  add column if not exists assigned_dow_personal smallint
  check (
    assigned_dow_personal is null
    or (assigned_dow_personal between 0 and 6)
  );
