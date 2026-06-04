'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X, Utensils, Search, ChevronDown, Pencil, ChefHat, CalendarDays, Flame } from 'lucide-react';
import { WeeklyMacrosSheet } from '@/components/meals/WeeklyMacrosSheet';
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
import { EditRecipeSheet } from '@/components/meals/EditRecipeSheet';
import { CollectionsRow } from '@/components/meals/CollectionsRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShareButton } from '@/components/ui/ShareButton';
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
  const { items: shoppingItems, toggleChecked, editItem: editShopping, deleteItem: deleteShopping, addManual, finish } = useShoppingList(weekStart);
  const { items: pantryItems, toggleInStock, addItem: addPantry, editItem: editPantry, deleteItem: deletePantry } = usePantry();

  const [editingRecipes, setEditingRecipes] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ day: MealDay; slot: MealSlot } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [tiktokSheet, setTiktokSheet] = useState<Recipe | null>(null);

  // Search query + collapse state for the Recetas tab.
  const [recipesQuery, setRecipesQuery] = useState('');
  // Default: every category collapsed EXCEPT lunch ("Comida"). When the user
  // leaves the Recetas tab and comes back this state resets — see the effect
  // below — so they always land on the same predictable view.
  const defaultCollapsed = () => new Set(['breakfast', 'dinner', 'snack', 'dessert', 'untyped']);
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(defaultCollapsed);

  // Reset to default whenever the active tab is not 'recetas'. The next time
  // the user opens Recetas the state is fresh.
  useEffect(() => {
    if (tab !== 'recetas') {
      setRecipesQuery('');
      setCollapsedBuckets(defaultCollapsed());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Group recipes by meal_type for the Recetas tab, filtered by the
  // search query against title and tags. Empty groups are skipped at render.
  const recipesByType = useMemo(() => {
    const buckets: Record<MealSlot | 'untyped', Recipe[]> = {
      breakfast: [], lunch: [], dinner: [], snack: [], dessert: [], untyped: [],
    };
    const q = recipesQuery.trim().toLowerCase();
    for (const r of recipes) {
      if (q) {
        const hay = `${r.title} ${(r.tags ?? []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const key = r.meal_type ?? 'untyped';
      buckets[key].push(r);
    }
    return buckets;
  }, [recipes, recipesQuery]);

  function toggleBucket(bucket: string) {
    setCollapsedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  }

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
        <div className="flex items-center gap-2">
          <Link
            href="/meals/restaurants"
            aria-label="Restaurantes"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95"
          >
            <Utensils size={18} strokeWidth={1.5} className="text-ink" aria-hidden />
          </Link>
          <Link href="/meals/recipes/new" aria-label="Nueva receta" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95">
            <Plus size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
          </Link>
        </div>
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
          {plan.length === 0 && (
            <div className="px-4">
              <EmptyState
                icon={CalendarDays}
                title="Aún no hay nada planificado"
                subtitle="Asigna recetas a los días de la semana."
                ctas={[
                  {
                    label: 'Planificar comidas',
                    onClick: () => openPicker('mon', 'lunch'),
                    variant: 'primary',
                  },
                ]}
              />
            </div>
          )}
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
          {/* Floating macros button — corner of the semana tab. Opens a
              modal with macros broken down by Semana / Día / Comida. */}
          <button
            type="button"
            aria-label="Ver macros de la semana"
            onClick={() => setMacrosOpen(true)}
            className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-2xl active:scale-95"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 16px) + 96px)' }}
          >
            <Flame size={22} strokeWidth={2} aria-hidden />
          </button>
          {macrosOpen && (
            <WeeklyMacrosSheet
              weekStart={weekStart}
              plan={plan}
              onClose={() => setMacrosOpen(false)}
            />
          )}
        </>
      )}

      {tab === 'recetas' && (
        <div className="flex flex-col gap-3 px-4">
          {recipes.length === 0 ? (
            <EmptyState
              icon={ChefHat}
              title="Aún no tienes recetas"
              subtitle="Importa una colección de TikTok o crea tu primera receta a mano."
              ctas={[
                { label: 'Importar colección', href: '/meals/recipes/new', variant: 'primary' },
                { label: 'Crear receta', href: '/meals/recipes/new', variant: 'secondary' },
              ]}
            />
          ) : (
            <>
              <CollectionsRow />
              {/* Search bar — instant filter against title + tags */}
              <div className="relative">
                <Search
                  size={16}
                  strokeWidth={1.75}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  aria-hidden
                />
                <input
                  type="search"
                  value={recipesQuery}
                  onChange={(e) => setRecipesQuery(e.target.value)}
                  placeholder="Buscar receta…"
                  aria-label="Buscar receta"
                  className="w-full rounded-full bg-white px-10 py-2.5 text-[14px] text-ink shadow-action placeholder:text-ink-muted focus:outline-none"
                />
                {recipesQuery && (
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setRecipesQuery('')}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink-soft text-ink active:scale-95"
                  >
                    <X size={14} strokeWidth={2} aria-hidden />
                  </button>
                )}
              </div>

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
                const collapsed = collapsedBuckets.has(bucket);
                return (
                  <section key={bucket} className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => toggleBucket(bucket)}
                      aria-expanded={!collapsed}
                      aria-controls={`recipes-bucket-${bucket}`}
                      className="flex items-center justify-between rounded-full bg-white px-3 py-1.5 shadow-action transition-transform duration-150 active:scale-[0.99]"
                    >
                      <span className="flex items-center gap-2">
                        <ChevronDown
                          size={14}
                          strokeWidth={2}
                          className="text-ink transition-transform duration-200"
                          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                          aria-hidden
                        />
                        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                          {label}
                        </span>
                      </span>
                      <span className="rounded-full bg-ink-soft px-2 py-0.5 text-[11px] font-bold tabular-nums text-ink">
                        {list.length}
                      </span>
                    </button>
                    {!collapsed && (
                      <div
                        id={`recipes-bucket-${bucket}`}
                        className="grid grid-cols-2 gap-3"
                      >
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
                            <>
                              <button
                                type="button"
                                aria-label={`Eliminar ${r.title}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingDelete(r); }}
                                className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white shadow-action active:scale-95"
                              >
                                <X size={14} strokeWidth={2.2} aria-hidden />
                              </button>
                              <button
                                type="button"
                                aria-label={`Editar ${r.title}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingRecipe(r); }}
                                className="absolute -left-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white shadow-action active:scale-95"
                              >
                                <Pencil size={12} strokeWidth={2} aria-hidden />
                              </button>
                            </>
                          )}
                          {editingRecipes ? (
                            <button
                              type="button"
                              onClick={() => setEditingRecipe(r)}
                              className="block w-full text-left"
                              aria-label={`Editar ${r.title}`}
                            >
                              <RecipeCard recipe={r} />
                            </button>
                          ) : r.source_type === 'tiktok' || r.source_type === 'instagram' ? (
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
                          {/* Share lives as an overlay so we don't have
                              to push RecipeCard's tight 2-col layout
                              around. Hidden in edit mode so it doesn't
                              clash with the X/Pencil chips. */}
                          {!editingRecipes && (
                            <div className="absolute right-1.5 top-1.5 z-10">
                              <ShareButton
                                target={{ kind: 'recipe', id: r.id, title: r.title }}
                                label={`Compartir ${r.title}`}
                                className="bg-white/90 shadow-action"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      </div>
                    )}
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
            onEdit={editShopping}
            onDelete={deleteShopping}
            recipeNamesById={recipeNamesById}
            pantryItems={pantryItems}
            onGenerateFromPlan={async () => {
              // Calls the same endpoint as GenerateShoppingButton so the
              // empty-state CTA actually does the same thing.
              try {
                const res = await fetch('/api/meals/generate-shopping', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ week_start: weekStart }),
                });
                if (res.ok) {
                  await refreshPlan();
                }
              } catch {
                // Swallow — the page will simply stay on the empty state.
              }
            }}
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
        <PantryList items={pantryItems} onToggle={toggleInStock} onAdd={addPantry} onEdit={editPantry} onDelete={deletePantry} />
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
      {editingRecipe && (
        <EditRecipeSheet recipe={editingRecipe} onClose={() => setEditingRecipe(null)} />
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
        checkedCount={shoppingItems.filter((i) => i.checked).length}
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
