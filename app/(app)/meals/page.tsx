'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { RecipeCard } from '@/components/meals/RecipeCard';
import { WeekPlanBoard } from '@/components/meals/WeekPlanBoard';
import { FridgeSection } from '@/components/meals/FridgeSection';
import { GenerateShoppingButton } from '@/components/meals/GenerateShoppingButton';
import { RecipePickerSheet } from '@/components/meals/RecipePickerSheet';
import { ShoppingList } from '@/components/meals/ShoppingList';
import { FinishShoppingSheet } from '@/components/meals/FinishShoppingSheet';
import { PantryList } from '@/components/meals/PantryList';
import { MealPassesSection } from '@/components/meals/MealPassesSection';
import { TikTokRecipeSheet } from '@/components/meals/TikTokRecipeSheet';
import { useRecipes, deleteRecipe } from '@/lib/hooks/use-recipes';
import type { Recipe } from '@/lib/meals/recipes';
import { useMealPlan, currentWeekStart } from '@/lib/hooks/use-meal-plan';
import { useShoppingList } from '@/lib/hooks/use-shopping-list';
import { usePantry } from '@/lib/hooks/use-pantry';
import { MEAL_SLOTS, mealSlotLabel, type MealDay, type MealSlot } from '@/lib/meals/recipes';

type Tab = 'semana' | 'recetas' | 'compra' | 'despensa' | 'pases';
const TABS: { value: Tab; label: string }[] = [
  { value: 'semana',   label: 'Semana'   },
  { value: 'recetas',  label: 'Recetas'  },
  { value: 'compra',   label: 'Compra'   },
  { value: 'despensa', label: 'Despensa' },
  { value: 'pases',    label: 'Pases'    },
];

function isTab(v: string | null): v is Tab {
  return v === 'semana' || v === 'recetas' || v === 'compra' || v === 'despensa' || v === 'pases';
}

export default function MealsHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab: Tab = isTab(searchParams.get('tab')) ? (searchParams.get('tab') as Tab) : 'semana';
  const [tab, setTabState] = useState<Tab>(initialTab);
  const weekStart = useMemo(() => currentWeekStart(), []);

  useEffect(() => {
    const q = searchParams.get('tab');
    if (isTab(q) && q !== tab) setTabState(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function setTab(next: Tab) {
    setTabState(next);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next === 'semana') params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.replace(`/meals${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  const { recipes, refresh: refreshRecipes } = useRecipes();
  const {
    plan,
    upsertSlot,
    clearSlot,
    refresh: refreshPlan,
    setPrepared,
    setEaten,
    cookAllToday,
  } = useMealPlan(weekStart);
  const { items: shoppingItems, toggleChecked, addManual, finish } = useShoppingList(weekStart);
  const { items: pantryItems, toggleInStock, addItem: addPantry } = usePantry();

  const [editingRecipes, setEditingRecipes] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Recipe | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ day: MealDay; slot: MealSlot } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [tiktokSheet, setTiktokSheet] = useState<Recipe | null>(null);

  // Group recipes by meal_type for the Recetas tab. Empty groups skipped.
  const recipesByType = useMemo(() => {
    const buckets: Record<MealSlot | 'untyped', Recipe[]> = {
      breakfast: [], lunch: [], dinner: [], snack: [], untyped: [],
    };
    for (const r of recipes) {
      const key = r.meal_type ?? 'untyped';
      buckets[key].push(r);
    }
    return buckets;
  }, [recipes]);

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
            onTogglePrepared={(day, slot, value) => { void setPrepared(day, slot, value); }}
            onToggleEaten={(day, slot, value) => { void setEaten(day, slot, value); }}
            onCookAll={() => cookAllToday()}
          />
          <FridgeSection
            plan={plan}
            onEat={(day, slot) => setEaten(day, slot, true)}
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
            <>
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  {recipes.length} {recipes.length === 1 ? 'receta' : 'recetas'}
                </p>
                <button
                  type="button"
                  onClick={() => setEditingRecipes((v) => !v)}
                  className={clsx(
                    'rounded-full px-3 py-1 text-[12px] font-bold transition-colors',
                    editingRecipes ? 'bg-ink text-white' : 'bg-white text-ink shadow-action',
                  )}
                >
                  {editingRecipes ? 'Listo' : 'Editar'}
                </button>
              </div>

              {([...MEAL_SLOTS, 'untyped'] as const).map((bucket) => {
                const list = recipesByType[bucket];
                if (list.length === 0) return null;
                const label = bucket === 'untyped' ? 'Sin tipo' : mealSlotLabel(bucket);
                return (
                  <section key={bucket} className="flex flex-col gap-3">
                    <header className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                        {label}
                      </p>
                      <p className="text-[11px] font-bold tabular-nums text-ink-muted">
                        {list.length}
                      </p>
                    </header>
                    <div className="grid grid-cols-2 gap-3">
                      {list.map((r, idx) => (
                        <div
                          key={r.id}
                          className={clsx(
                            'relative',
                            editingRecipes && (idx % 2 === 0 ? 'animate-wobble-l' : 'animate-wobble-r'),
                          )}
                          style={editingRecipes ? { animationDelay: `${(idx % 4) * 70}ms` } : undefined}
                        >
                          {editingRecipes && (
                            <button
                              type="button"
                              aria-label={`Eliminar ${r.title}`}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingDelete(r); }}
                              className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white shadow-action active:scale-95"
                            >
                              <X size={14} strokeWidth={2.2} aria-hidden />
                            </button>
                          )}
                          {editingRecipes ? (
                            <div className="block">
                              <RecipeCard recipe={r} />
                            </div>
                          ) : r.source_type === 'tiktok' ? (
                            <button
                              type="button"
                              onClick={() => setTiktokSheet(r)}
                              className="block w-full text-left"
                              aria-label={`Ver vídeo de ${r.title}`}
                            >
                              <RecipeCard recipe={r} />
                            </button>
                          ) : (
                            <Link href={`/meals/recipes/${r.id}`} className="block">
                              <RecipeCard recipe={r} />
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </>
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
            pantryItems={pantryItems}
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

      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-8"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-card bg-white p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Eliminar receta
            </p>
            <p className="mt-2 font-sans text-[18px] font-extrabold leading-tight text-ink">
              ¿Borrar “{pendingDelete.title}”?
            </p>
            <p className="mt-1 text-[12px] text-ink-muted">
              Se eliminan ingredientes, pasos y planes semanales asociados. Es definitivo.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-action border border-ink-soft py-3 text-[13px] font-bold text-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = pendingDelete;
                  setPendingDelete(null);
                  const res = await deleteRecipe(target.id);
                  if ('ok' in res) {
                    void refreshRecipes();
                    void refreshPlan();
                  }
                }}
                className="flex-1 rounded-action bg-danger py-3 text-[13px] font-bold text-white"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <TikTokRecipeSheet recipe={tiktokSheet} onClose={() => setTiktokSheet(null)} />

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
