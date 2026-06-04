-- Nutritional macros per 100g of product. Source tracks where the values
-- came from: 'mercadona' (from Mercadona API, rare — they only expose
-- ingredients), 'off' (OpenFoodFacts EAN lookup, the common case),
-- 'estimate' (category-based fallback, marked in UI), 'manual' (user
-- typed). NULL means "unknown / not looked up yet".

do $$
begin
  if not exists (select 1 from pg_type where typname = 'macros_source_kind') then
    create type macros_source_kind as enum ('mercadona', 'off', 'estimate', 'manual');
  end if;
end$$;

alter table pantry_items
  add column if not exists kcal_100g     numeric,
  add column if not exists protein_100g  numeric,
  add column if not exists carbs_100g    numeric,
  add column if not exists fat_100g      numeric,
  add column if not exists macros_source macros_source_kind;

alter table shopping_list
  add column if not exists kcal_100g     numeric,
  add column if not exists protein_100g  numeric,
  add column if not exists carbs_100g    numeric,
  add column if not exists fat_100g      numeric,
  add column if not exists macros_source macros_source_kind;

alter table recipe_ingredients
  add column if not exists kcal_100g     numeric,
  add column if not exists protein_100g  numeric,
  add column if not exists carbs_100g    numeric,
  add column if not exists fat_100g      numeric,
  add column if not exists macros_source macros_source_kind,
  -- Mercadona EAN if known — lets us re-lookup macros later without
  -- re-running the search.
  add column if not exists off_barcode   text;
