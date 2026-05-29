# Supabase migrations

The MKXA Supabase project (`jxyqbtttgpdokotmbeud`) lives outside the MCP-connected account. Migrations are applied via the Supabase CLI using a personal access token of the project owner.

## How to apply

From the project root:

```bash
SUPABASE_ACCESS_TOKEN=<owner PAT> supabase link --project-ref jxyqbtttgpdokotmbeud
SUPABASE_ACCESS_TOKEN=<owner PAT> supabase db push --include-all
```

Or paste each SQL file from `supabase/migrations/` into the [dashboard SQL editor](https://supabase.com/dashboard/project/jxyqbtttgpdokotmbeud/sql/new).

## Applied log

- `20260528120000_mood_logs.sql` — applied 2026-05-29
- `20260528120100_expenses_and_storage.sql` — applied 2026-05-29 (creates `expenses` + `receipts` storage bucket)
- `20260528120200_meals.sql` — applied 2026-05-29 (recipes, recipe_ingredients, recipe_steps, meal_plan)
- `20260528120300_shopping_and_pantry.sql` — applied 2026-05-29 (pantry_items, shopping_list)
- `20260529120000_athlete_profiles.sql` — applied 2026-05-29 (athlete_profiles table + avatars bucket)
- `20260529130000_training_weeks.sql` — applied 2026-05-29 (training_weeks + training_sources tables)
- `20260529170000_meal_passes.sql` — applied 2026-05-29 (meal_passes table for monthly eat-out tickets)
