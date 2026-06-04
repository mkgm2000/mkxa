'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { WeekPlanBoard } from '@/components/meals/WeekPlanBoard';
import { GenerateShoppingButton } from '@/components/meals/GenerateShoppingButton';
import { RecipePickerSheet } from '@/components/meals/RecipePickerSheet';
import { useRecipes } from '@/lib/hooks/use-recipes';
import { useMealPlan, nextWeekStart } from '@/lib/hooks/use-meal-plan';
import { isoWeekNumber } from '@/lib/date';
import type { MealDay, MealSlot } from '@/lib/meals/recipes';

export default function WeekPlanPage() {
  const router = useRouter();
  const { recipes } = useRecipes();
  const weekStart = useMemo(() => nextWeekStart(), []);
  const weekNumber = useMemo(() => isoWeekNumber(weekStart), [weekStart]);
  const { plan, upsertSlot, clearSlot } = useMealPlan(weekStart);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [target, setTarget] = useState<{ day: MealDay; slot: MealSlot } | null>(null);

  return (
    <main className="flex flex-col gap-4 px-1 pt-4 pb-6">
      <header className="flex items-center justify-between px-4">
        <Link href="/meals" aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">Semana {weekNumber}</h1>
        <span aria-hidden className="h-10 w-10" />
      </header>

      <WeekPlanBoard
        weekStart={weekStart}
        plan={plan}
        onPick={(day, slot) => { setTarget({ day, slot }); setPickerOpen(true); }}
        onClear={async (day, slot) => { await clearSlot({ day, slot }); }}
      />

      <GenerateShoppingButton weekStart={weekStart} onGenerated={() => router.push('/meals/shopping')} />

      <RecipePickerSheet
        open={pickerOpen}
        recipes={recipes}
        onClose={() => setPickerOpen(false)}
        onPick={async (r) => {
          if (!target) return;
          await upsertSlot({ day: target.day, slot: target.slot, recipe_id: r.id });
        }}
      />
    </main>
  );
}
