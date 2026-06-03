'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Flame } from 'lucide-react';
import { AvatarCircle } from '@/components/profile/AvatarCircle';
import { NotificationBell } from '@/components/home/NotificationBell';
import { HorizontalCardRow } from '@/components/home/HorizontalCardRow';
import { WeekStrip } from '@/components/home/WeekStrip';
import { GastosCard } from '@/components/home/GastosCard';
import { CinemaWidget } from '@/components/home/CinemaWidget';
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

  const restaurantCards = useMemo(
    () => restaurants
      .filter((r) => r.status === 'wishlist')
      .slice(0, 10)
      .map((r) => {
        const c = cuisineMeta(r.cuisine);
        return {
          key: r.id,
          href: '/meals/restaurants',
          image: r.image_url,
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
    // overflow-x-hidden locks the page to the viewport width so the inner
    // horizontal-scroll rows don't bleed sideways. Without this the cards'
    // own padding/edges drag the whole page left/right.
    <main className="flex flex-col gap-5 overflow-x-hidden pt-2">
      <header className="flex items-center justify-between px-5 pt-6">
        <Link href="/profile" aria-label="Ir al perfil" className="shrink-0">
          <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={44} />
        </Link>
        <NotificationBell />
      </header>

      <div className="px-5"><InlineSaveText /></div>

      <WeekStrip />

      {/* 2-col hero row: training session left, expenses right.
          On phones the columns scale 60/40-ish so the action card stays the
          primary thing the user notices. */}
      {nextSession && (
        <section className="grid grid-cols-[3fr_2fr] gap-3 px-5">
          <Link
            href="/training"
            className="flex flex-col justify-between rounded-card bg-ink p-4 text-white shadow-card transition-transform duration-150 active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/65">
                <Flame size={11} strokeWidth={1.75} aria-hidden />
                Próxima sesión
              </p>
              <h2 className="mt-1.5 truncate font-sans text-[20px] font-extrabold leading-tight tracking-tightest">
                {nextSession.title}
              </h2>
              <p className="mt-0.5 text-[11px] text-white/70">
                {nextSession.key} · S{week} · {nextSession.rpe}
              </p>
            </div>
            <span className="mt-3 self-end flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink">
              <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
            </span>
          </Link>
          <GastosCard />
        </section>
      )}

      <CinemaWidget />

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
    </main>
  );
}
