-- Enforce single confirmed row per (athlete, week). Previously two parallel
-- confirms could race past the supersede update and leave two confirmed rows;
-- useConfirmedWeek then 406'd on maybeSingle() and the UI silently fell back
-- to the static baseline with no visible plan and no badge.
create unique index if not exists training_weeks_one_confirmed_per_week_idx
  on training_weeks (athlete, week)
  where status = 'confirmed';
