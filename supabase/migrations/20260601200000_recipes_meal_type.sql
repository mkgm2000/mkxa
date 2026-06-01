-- Add meal_type taxonomy to recipes.
-- Lets us group recipes by meal slot (breakfast/lunch/dinner/snack).
-- Null is allowed: existing recipes stay untyped until the user classifies them.

alter table recipes
  add column if not exists meal_type text;

alter table recipes
  drop constraint if exists recipes_meal_type_check;

alter table recipes
  add constraint recipes_meal_type_check
  check (meal_type in ('breakfast','lunch','dinner','snack') or meal_type is null);

create index if not exists recipes_meal_type_idx on recipes (meal_type);
