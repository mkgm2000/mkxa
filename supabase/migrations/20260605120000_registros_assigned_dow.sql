-- Per-week weekday assignment for each training day_key (D1..D4).
--
-- MK + Xabi train together but the schedule shifts week to week
-- (work conflicts, races, etc.). This lets them drag a session
-- from e.g. Wednesday to Thursday without losing logs or breaking
-- the D1..D4 sequence the plan was authored around.
--
-- Values: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun (matches
-- the order MEAL_DAYS uses elsewhere in the app). NULL = follow the
-- default mapping defined in the client (D1→Mon, D2→Wed, D3→Fri,
-- D4→Sat). Mirrored between athletes when written so the schedule
-- stays in sync — see useTraining.setAssignedDow.

alter table public.registros
  add column if not exists assigned_dow smallint
  check (assigned_dow is null or (assigned_dow >= 0 and assigned_dow <= 6));
