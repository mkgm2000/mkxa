'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Flame, MapPin } from 'lucide-react';
import { AvatarCircle } from '@/components/profile/AvatarCircle';
import { NotificationBell } from '@/components/home/NotificationBell';
import { HorizontalCardRow } from '@/components/home/HorizontalCardRow';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { useAthlete } from '@/lib/athlete-context';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';
import { useRecipes } from '@/lib/hooks/use-recipes';
import { useRestaurants } from '@/lib/hooks/use-restaurants';
import { useMealPlan, currentWeekStart } from '@/lib/hooks/use-meal-plan';
import { getCurrentWeek, getDays } from '@/lib/plan-hyrox';
import { useTraining } from '@/lib/hooks/use-training';
import { cuisineMeta } from '@/lib/meals/restaurants';
import { mealSlotLabel } from '@/lib/meals/recipes';
import type { MealDay, MealPlanRow, MealSlot } from '@/lib/meals/recipes';

const DAY_LABELS: Record<MealDay, string> = {
  mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom',
};
const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

// Card-feed layout (redesign 2026-06-03): avatar + bell up top with no
// greeting, then horizontally-scrolling sections for recipes, week meals,
// restaurants and the next training session. Mirrors the pet-store
// reference the user shared, kept in the mkxa palette.
export default function HomePage() {
  const athlete = useAthlete();
  const { profile } = useAthleteProfile(athlete);
  const { recipes } = useRecipes();
  const { items: restaurants } = useRestaurants();
  const weekStart = useMemo(() => currentWeekStart(), []);
  const { plan } = useMealPlan(weekStart);

  const week = getCurrentWeek();
  const days = getDays(week, athlete);
  const { byKey } = useTraining(athlete, week);
  const nextSession = days.find((d) => !byKey[d.key]?.completed) ?? days[0];

  // Take last 10 recipes the user (or partner) added.
  const recipeCards = useMemo(
    () => recipes.slice(0, 10).map((r) => ({
      key: r.id,
      href: `/meals?tab=recetas`,
      image: r.thumbnail_url ?? r.image_url ?? null,
      fallbackEmoji: '🍽️',
      badge: r.meal_type ? mealSlotLabel(r.meal_type) : undefined,
      title: r.title,
      meta: r.created_by ? `por ${r.created_by}` : undefined,
    })),
    [recipes],
  );

  // Week-plan view: each row in the flat MealPlanRow[] that has a recipe
  // attached becomes a card. Sorted by day-of-week order then slot order
  // so the row reads left → right as the week unfolds.
  const weekCards = useMemo(() => {
    const dayOrder: MealDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const rows = (plan as MealPlanRow[]) ?? [];
    return rows
      .filter((r) => r.recipe)
      .slice()
      .sort((a, b) => {
        const da = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (da !== 0) return da;
        return SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
      })
      .map((r) => ({
        key: r.id,
        href: '/meals?tab=semana',
        image: r.recipe?.thumbnail_url ?? r.recipe?.image_url ?? null,
        fallbackEmoji: '🍳',
        badge: DAY_LABELS[r.day],
        title: r.recipe?.title ?? 'Receta',
        meta: mealSlotLabel(r.slot),
      }));
  }, [plan]);

  // Restaurants the couple still want to visit.
  const restaurantCards = useMemo(
    () => restaurants
      .filter((r) => r.status === 'wishlist')
      .slice(0, 10)
      .map((r) => {
        const c = cuisineMeta(r.cuisine);
        return {
          key: r.id,
          href: '/meals/restaurants',
          image: null,
          fallbackEmoji: c.emoji,
          fallbackBg: `${c.color}1F`,
          badge: r.price_tier ?? undefined,
          title: r.name,
          meta: r.location ?? c.label,
        };
      }),
    [restaurants],
  );

  if (!athlete) return null;

  return (
    <main className="flex flex-col gap-5 pt-2">
      <header className="flex items-center justify-between px-5 pt-6">
        <Link href="/profile" aria-label="Ir al perfil" className="shrink-0">
          <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={44} />
        </Link>
        <NotificationBell />
      </header>

      <div className="px-5"><InlineSaveText /></div>

      {/* Hero — Próxima sesión as the big card the user opens first */}
      {nextSession && (
        <section className="px-5">
          <Link
            href="/training"
            className="flex items-center justify-between rounded-card bg-ink p-4 text-white shadow-card transition-transform duration-150 active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/65">
                <Flame size={11} strokeWidth={1.75} aria-hidden />
                Próxima sesión
              </p>
              <h2 className="mt-1 truncate font-sans text-[22px] font-extrabold leading-tight tracking-tightest">
                {nextSession.title}
              </h2>
              <p className="mt-0.5 text-[12px] text-white/70">
                {nextSession.key} · S{week} · {nextSession.rpe}
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink">
              <ArrowUpRight size={20} strokeWidth={2} aria-hidden />
            </span>
          </Link>
        </section>
      )}

      <HorizontalCardRow
        title="Recetas"
        seeAllHref="/meals?tab=recetas"
        items={recipeCards}
        emptyText="Aún no tienes recetas. Añade la primera desde Comidas."
      />

      <HorizontalCardRow
        title="Esta semana"
        seeAllHref="/meals"
        items={weekCards}
        emptyText="Sin plan de comidas esta semana."
      />

      <HorizontalCardRow
        title="Por visitar"
        seeAllHref="/meals/restaurants"
        items={restaurantCards}
        emptyText="No tenéis restaurantes en lista. Añade uno desde Restaurantes."
      />

      <section className="px-5 pb-2 text-center">
        <Link
          href="/mood"
          className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-muted underline-offset-2 hover:underline"
        >
          <MapPin size={12} strokeWidth={1.75} aria-hidden />
          Ver año en mood
        </Link>
      </section>
    </main>
  );
}
