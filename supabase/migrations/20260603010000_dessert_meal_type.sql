-- Add 'dessert' (Postres) to allowed meal slot values.
-- Updates check constraints on recipes.meal_type and meal_plan.slot.

alter table recipes
  drop constraint if exists recipes_meal_type_check;

alter table recipes
  add constraint recipes_meal_type_check
  check (meal_type in ('breakfast','lunch','dinner','snack','dessert') or meal_type is null);

alter table meal_plan
  drop constraint if exists meal_plan_slot_check;

alter table meal_plan
  add constraint meal_plan_slot_check
  check (slot in ('breakfast','lunch','dinner','snack','dessert'));
