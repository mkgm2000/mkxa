'use client';

import { Utensils, Snowflake } from 'lucide-react';
import {
  DAY_LABELS,
  type MealDay,
  type MealPlanRow,
  type MealSlot,
} from '@/lib/meals/recipes';

interface FridgeSectionProps {
  plan: MealPlanRow[];
  onEat: (day: MealDay, slot: MealSlot) => void | Promise<void>;
}

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Snack',
  dessert: 'Postres',
};

const DAY_ORDER: Record<MealDay, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};
const SLOT_ORDER: Record<MealSlot, number> = {
  breakfast: 0, lunch: 1, snack: 2, dessert: 3, dinner: 4,
};

export function FridgeSection({ plan, onEat }: FridgeSectionProps) {
  const inFridge = plan
    .filter((r) => r.prepared === true && r.eaten !== true && r.recipe_id)
    .sort((a, b) => {
      const d = DAY_ORDER[a.day] - DAY_ORDER[b.day];
      if (d !== 0) return d;
      return SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot];
    });

  return (
    <section className="flex flex-col gap-3 px-4 pt-2">
      <header className="flex items-baseline justify-between px-1">
        <h2 className="flex items-center gap-1.5 font-sans text-[20px] font-extrabold leading-none text-ink">
          <Snowflake size={16} strokeWidth={1.5} aria-hidden />
          En la nevera
        </h2>
        <span className="text-[12px] font-bold tabular-nums text-ink-muted">
          {inFridge.length}
        </span>
      </header>

      {inFridge.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-ink-soft bg-white/40 px-5 py-8 text-center">
          <p className="text-[13px] font-medium text-ink-muted">
            Nevera vacía — todo comido o nada cocinado aún
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {inFridge.map((row) => {
            const title = row.recipe?.title ?? 'Receta';
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    {DAY_LABELS[row.day]} · {SLOT_LABELS[row.slot]}
                  </p>
                  <p className="mt-0.5 truncate text-[14px] font-bold text-ink">
                    {title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEat(row.day, row.slot)}
                  className="inline-flex items-center gap-1.5 rounded-action bg-ink px-3 py-2 text-[12px] font-bold text-white active:scale-95"
                >
                  <Utensils size={14} strokeWidth={1.5} aria-hidden />
                  Comer ahora
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
