# Supabase migrations

The MKXA Supabase project (`jxyqbtttgpdokotmbeud`) lives outside the MCP-connected account, so migrations cannot be applied automatically by Claude. Apply each new migration manually after merging.

## How to apply

Open the [Supabase dashboard SQL editor](https://supabase.com/dashboard/project/jxyqbtttgpdokotmbeud/sql/new) and paste the SQL from the next pending migration in `supabase/migrations/`. Run it; verify success in the response panel.

Track applied migrations in this table by appending to the log below.

## Applied log

- `20260528120000_mood_logs.sql` — pending
- `20260528120100_expenses_and_storage.sql` — pending (creates `expenses` table with `set_updated_at()` trigger and private `receipts` storage bucket; open RLS)
- `20260528120200_meals.sql` — pending (recipes, recipe_ingredients, recipe_steps, meal_plan tables)
- `20260528120300_shopping_and_pantry.sql` — pending (pantry_items, shopping_list tables)
