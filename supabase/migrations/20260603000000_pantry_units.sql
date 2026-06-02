-- Add optional integer `units` column to pantry_items so users can track how
-- many of an item they have on hand (e.g. 6 latas, 2 paquetes).
alter table pantry_items add column if not exists units int;
