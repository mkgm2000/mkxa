'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { RecipeCard } from '@/components/meals/RecipeCard';
import { WeekPlanBoard } from '@/components/meals/WeekPlanBoard';
import { GenerateShoppingButton } from '@/components/meals/GenerateShoppingButton';
import { RecipePickerSheet } from '@/components/meals/RecipePickerSheet';
import { ShoppingList } from '@/components/meals/ShoppingList';
import { FinishShoppingSheet } from '@/components/meals/FinishShoppingSheet';
import { PantryList } from '@/components/meals/PantryList';
import { useRecipes } from '@/lib/hooks/use-recipes';
import { useMealPlan, currentWeekStart } from '@/lib/hooks/use-meal-plan';
import { useShoppingList } from '@/lib/hooks/use-shopping-list';
import { usePantry } from '@/lib/hooks/use-pantry';
import type { MealDay, MealSlot } from '@/lib/meals/recipes';

type Tab = 'semana' | 'recetas' | 'compra' | 'despensa';
const TABS: { value: Tab; label: string }[] = [
  { value: 'semana',   label: 'Semana'   },
  { value: 'recetas',  label: 'Recetas'  },
  { value: 'compra',   label: 'Compra'   },
  { value: 'despensa', label: 'Despensa' },
];

export default function MealsHubPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('semana');
  const weekStart = useMemo(() => currentWeekStart(), []);

  const { recipes } = useRecipes();
  const { plan, upsertSlot, clearSlot, refresh: refreshPlan } = useMealPlan(weekStart);
  const { items: shoppingItems, toggleChecked, addManual, finish } = useShoppingList(weekStart);
  const { items: pantryItems, toggleInStock } = usePantry();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ day: MealDay; slot: MealSlot } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);

  const recipeNamesById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of recipes) m[r.id] = r.title;
    return m;
  }, [recipes]);

  function openPicker(day: MealDay, slot: MealSlot) {
    setPickerTarget({ day, slot });
    setPickerOpen(true);
  }

  async function pickRecipe(r: { id: string }) {
    if (!pickerTarget) return;
    await upsertSlot({ day: pickerTarget.day, slot: pickerTarget.slot, recipe_id: r.id });
    setPickerTarget(null);
  }

  return (
    <main className="flex flex-col gap-3 pt-2">
      <header className="flex items-start justify-between gap-4 px-5 pt-6">
        <div>
          <h1 className="font-sans text-[36px] font-extrabold leading-[1.05] tracking-tightest text-ink">
            Comidas
          </h1>
          <p className="mt-2 text-[13px] text-ink-muted">Semana del {weekStart}</p>
        </div>
        <Link href="/meals/scan" aria-label="Añadir receta" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95">
          <Plus size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
      </header>

      <div className="px-5"><InlineSaveText /></div>

      <div className="px-5">
        <div role="tablist" aria-label="Sección" className="relative grid grid-cols-4 rounded-full bg-white p-1.5 shadow-action">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/4)] rounded-full bg-ink transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${TABS.findIndex((t) => t.value === tab) * 100}%)` }}
          />
          {TABS.map((t) => {
            const active = t.value === tab;
            return (
              <button
                key={t.value}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.value)}
                className={clsx('relative z-10 py-2 text-[13px] transition-colors',
                  active ? 'text-white font-bold' : 'text-ink-muted font-medium')}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'semana' && (
        <>
          <WeekPlanBoard
            weekStart={weekStart}
            plan={plan}
            onPick={openPicker}
            onClear={async (day, slot) => { await clearSlot({ day, slot }); }}
          />
          <GenerateShoppingButton
            weekStart={weekStart}
            onGenerated={() => { setTab('compra'); refreshPlan(); }}
          />
        </>
      )}

      {tab === 'recetas' && (
        <div className="grid grid-cols-2 gap-3 px-4">
          {recipes.length === 0 && (
            <p className="col-span-2 py-6 text-center text-[13px] text-ink-muted">
              Sin recetas. Toca + para añadir desde TikTok.
            </p>
          )}
          {recipes.map((r) => (
            <Link key={r.id} href={`/meals/recipes/${r.id}`} className="block">
              <RecipeCard recipe={r} />
            </Link>
          ))}
        </div>
      )}

      {tab === 'compra' && (
        <>
          <ShoppingList
            items={shoppingItems}
            onToggle={toggleChecked}
            onAddManual={addManual}
            recipeNamesById={recipeNamesById}
          />
          {shoppingItems.length > 0 && (
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setFinishOpen(true)}
                className="w-full rounded-action bg-ink py-4 text-[14px] font-bold text-white"
              >
                Finalizar compra
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'despensa' && (
        <PantryList items={pantryItems} onToggle={toggleInStock} />
      )}

      <RecipePickerSheet
        open={pickerOpen}
        recipes={recipes}
        onClose={() => setPickerOpen(false)}
        onPick={pickRecipe}
      />
      <FinishShoppingSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        onFinish={async (input) => {
          const res = await finish(input);
          if (res && 'expense_id' in res && res.expense_id) {
            router.push(`/expenses/${res.expense_id}`);
          }
          return res;
        }}
      />
    </main>
  );
}
