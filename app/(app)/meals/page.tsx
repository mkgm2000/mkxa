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
import { MealPassesSection } from '@/components/meals/MealPassesSection';
import { useRecipes } from '@/lib/hooks/use-recipes';
import { useMealPlan, currentWeekStart } from '@/lib/hooks/use-meal-plan';
import { useShoppingList } from '@/lib/hooks/use-shopping-list';
import { usePantry } from '@/lib/hooks/use-pantry';
import type { MealDay, MealSlot } from '@/lib/meals/recipes';

type Tab = 'semana' | 'recetas' | 'compra' | 'despensa' | 'pases';
const TABS: { value: Tab; label: string }[] = [
  { value: 'semana',   label: 'Semana'   },
  { value: 'recetas',  label: 'Recetas'  },
  { value: 'compra',   label: 'Compra'   },
  { value: 'despensa', label: 'Despensa' },
  { value: 'pases',    label: 'Pases'    },
];

export default function MealsHubPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('semana');
  const weekStart = useMemo(() => currentWeekStart(), []);

  const { recipes } = useRecipes();
  const { plan, upsertSlot, clearSlot, refresh: refreshPlan } = useMealPlan(weekStart);
  const { items: shoppingItems, toggleChecked, addManual, finish } = useShoppingList(weekStart);
  const { items: pantryItems, toggleInStock, addItem: addPantry } = usePantry();

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
        <Link href="/meals/recipes/new" aria-label="Nueva receta" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95">
          <Plus size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
      </header>

      <div className="px-5"><InlineSaveText /></div>

      <div className="px-5">
        <div role="tablist" aria-label="Sección" className="relative grid grid-cols-5 rounded-full bg-white p-1.5 shadow-action">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/5)] rounded-full bg-ink transition-transform duration-200 ease-out"
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
        <div className="flex flex-col gap-3 px-4">
          {recipes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-ink-soft bg-white/40 px-5 py-8 text-center">
              <span className="text-[36px]" aria-hidden>🥘</span>
              <p className="font-sans text-[15px] font-bold text-ink">Sin recetas aún</p>
              <p className="text-[12px] text-ink-muted">
                Empieza con una plantilla — pasta, pollo, ensalada… cambias lo que necesites.
              </p>
              <Link
                href="/meals/recipes/new"
                className="mt-2 rounded-action bg-ink px-5 py-2.5 text-[13px] font-bold text-white"
              >
                Elegir plantilla
              </Link>
              <Link href="/meals/scan" className="text-[12px] font-medium text-ink-muted underline">
                o importar desde TikTok / web
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recipes.map((r) => (
                <Link key={r.id} href={`/meals/recipes/${r.id}`} className="block">
                  <RecipeCard recipe={r} />
                </Link>
              ))}
            </div>
          )}
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
        <PantryList items={pantryItems} onToggle={toggleInStock} onAdd={addPantry} />
      )}

      {tab === 'pases' && <MealPassesSection />}

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
