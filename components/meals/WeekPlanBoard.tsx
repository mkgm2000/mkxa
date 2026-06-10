'use client';

import { ChefHat, Check } from 'lucide-react';
import { DaySlotCard } from './DaySlotCard';
import {
  MEAL_DAYS, DAY_LABELS,
  type MealDay, type MealPlanRow, type MealSlot,
} from '@/lib/meals/recipes';

const DEFAULT_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

interface WeekPlanBoardProps {
  weekStart: string;
  plan: MealPlanRow[];
  slots?: MealSlot[];
  onPick: (day: MealDay, slot: MealSlot) => void;
  onClear: (day: MealDay, slot: MealSlot) => void;
  onTogglePrepared?: (day: MealDay, slot: MealSlot, value: boolean) => void;
  onToggleEaten?: (day: MealDay, slot: MealSlot, value: boolean) => void;
  onCookAll?: () => void | Promise<void>;
  /** Edit mode: tapping a slot opens the picker; cards with recipe wiggle. */
  editMode?: boolean;
  onEnterEditMode?: () => void;
  onExitEditMode?: () => void;
}

function rowFor(plan: MealPlanRow[], day: MealDay, slot: MealSlot): MealPlanRow | undefined {
  return plan.find((p) => p.day === day && p.slot === slot);
}

function dayNumber(weekStart: string, dayIdx: number): number {
  const [y, m, d] = weekStart.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dayIdx));
  return dt.getUTCDate();
}

export function WeekPlanBoard({
  weekStart,
  plan,
  slots = DEFAULT_SLOTS,
  onPick,
  onClear,
  onTogglePrepared,
  onToggleEaten,
  onCookAll,
  editMode = false,
  onEnterEditMode,
  onExitEditMode,
}: WeekPlanBoardProps) {
  return (
    <div className="flex flex-col gap-4 px-4">
      {onCookAll && !editMode && (
        <div className="flex justify-end px-1">
          <button
            type="button"
            onClick={() => { void onCookAll(); }}
            className="inline-flex items-center gap-1.5 rounded-action bg-ink px-3 py-2 text-[12px] font-bold text-white active:scale-95"
          >
            <ChefHat size={14} strokeWidth={1.5} aria-hidden />
            Cocinar todo (domingo)
          </button>
        </div>
      )}
      {MEAL_DAYS.map((day, dayIdx) => (
        <section key={day}>
          <header className="mb-2 flex items-baseline gap-2 px-1">
            <span className="font-sans text-[20px] font-extrabold leading-none text-ink">
              {DAY_LABELS[day]}
            </span>
            <span className="text-[13px] font-bold tabular-nums text-ink-muted">
              {dayNumber(weekStart, dayIdx)}
            </span>
          </header>
          <div className="flex flex-col gap-2">
            {slots.map((slot, slotIdx) => (
              <DaySlotCard
                key={slot}
                day={day}
                slot={slot}
                row={rowFor(plan, day, slot)}
                onPick={(d, s) => {
                  onPick(d, s);
                  // Tapping an empty slot in edit mode picks AND exits.
                  if (editMode && !rowFor(plan, d, s)?.recipe) onExitEditMode?.();
                }}
                onClear={onClear}
                onTogglePrepared={onTogglePrepared}
                onToggleEaten={onToggleEaten}
                editMode={editMode}
                onLongPress={editMode ? undefined : onEnterEditMode}
                wobbleIdx={dayIdx * slots.length + slotIdx}
              />
            ))}
          </div>
        </section>
      ))}
      {editMode && onExitEditMode && (
        <button
          type="button"
          onClick={onExitEditMode}
          className="fixed left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-5 py-3 text-[13px] font-bold text-white shadow-2xl active:scale-95"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 16px) + 96px)' }}
        >
          <Check size={14} strokeWidth={2} aria-hidden />
          Listo
        </button>
      )}
    </div>
  );
}
