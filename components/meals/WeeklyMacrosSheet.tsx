'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { X, AlertCircle, Flame, Activity } from 'lucide-react';
import { useWeeklyMacros, type WeeklyMacrosSlotRow } from '@/lib/hooks/use-weekly-macros';
import { roundMacros, type MacrosSum } from '@/lib/meals/macros';
import { DAY_LABELS, mealSlotLabel, type MealPlanRow, type MealDay, type MealSlot } from '@/lib/meals/recipes';

interface Props {
  weekStart: string;
  plan: MealPlanRow[];
  onClose: () => void;
}

type View = 'week' | 'day' | 'meal';

const DAY_ORDER: MealDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

export function WeeklyMacrosSheet({ weekStart, plan, onClose }: Props) {
  const { loading, hasEstimate, byDay, byMeal, bySlot, total } = useWeeklyMacros(weekStart, plan);
  const [view, setView] = useState<View>('week');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function k(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const totalRounded = roundMacros(total);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Macros de la semana"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:h-[82vh] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-ink-soft/40 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              Macros del plan
            </p>
            <h3 className="mt-0.5 font-sans text-[18px] font-extrabold text-ink">
              {totalRounded.kcal.toLocaleString('es-ES')} kcal · semana
            </h3>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
          >
            <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
          </button>
        </div>

        <div className="px-4 pt-3">
          <div role="tablist" className="relative grid grid-cols-3 rounded-full bg-ink-soft/40 p-1">
            <span
              aria-hidden
              className="pointer-events-none absolute left-1 top-1 bottom-1 w-[calc((100%-8px)/3)] rounded-full bg-white shadow-card transition-transform duration-200 ease-out"
              style={{ transform: `translateX(${(['week','day','meal'] as const).indexOf(view) * 100}%)` }}
            />
            {(['week','day','meal'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={clsx(
                  'relative z-10 py-1.5 text-[12px] font-bold',
                  view === v ? 'text-ink' : 'text-ink-muted',
                )}
              >
                {v === 'week' ? 'Semana' : v === 'day' ? 'Día' : 'Comida'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
          {loading ? (
            <p className="py-10 text-center text-[12px] text-ink-muted">Calculando…</p>
          ) : (
            <>
              {view === 'week' && <WeekView total={total} bySlot={bySlot} />}
              {view === 'day' && <DayView byDay={byDay} bySlot={bySlot} />}
              {view === 'meal' && <MealView byMeal={byMeal} bySlot={bySlot} />}
            </>
          )}
        </div>

        {hasEstimate && (
          <div className="border-t border-ink-soft/40 bg-amber-50 px-4 py-2 text-[11px] leading-tight text-amber-800">
            <p className="flex items-start gap-1.5">
              <AlertCircle size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
              Algunos valores son aproximados. Las recetas sin macros reales usan estimaciones por categoría — añade productos vía Buscar para ganar precisión.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MacrosCard({ macros, title, subtitle }: { macros: MacrosSum; title: string; subtitle?: string }) {
  const m = roundMacros(macros);
  const tilde = m.hasEstimate ? '≈ ' : '';
  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">{title}</p>
          {subtitle && <p className="text-[11px] text-ink-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 text-[22px] font-extrabold tabular-nums text-ink">
          <Flame size={16} className="text-orange-500" aria-hidden />
          {tilde}{m.kcal.toLocaleString('es-ES')}
          <span className="text-[11px] font-bold text-ink-muted">kcal</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MacroPill label="Prot" value={m.protein} color="#3da7ff" />
        <MacroPill label="Carbs" value={m.carbs} color="#fed282" />
        <MacroPill label="Grasa" value={m.fat} color="#ff8a8e" />
      </div>
    </div>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-action py-2" style={{ background: `${color}1F` }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#1b1d1f' }}>{label}</p>
      <p className="text-[15px] font-extrabold tabular-nums text-ink">{value}g</p>
    </div>
  );
}

function SlotChip({ row }: { row: WeeklyMacrosSlotRow }) {
  const m = roundMacros(row.macros);
  return (
    <div className="flex items-center gap-2 rounded-action bg-white px-3 py-2 shadow-action">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] font-extrabold uppercase text-white">
        {DAY_LABELS[row.day].charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[12px] font-bold text-ink">{row.recipeTitle ?? '—'}</p>
        <p className="text-[10px] text-ink-muted">{mealSlotLabel(row.slot)} · {row.servings} {row.servings === 1 ? 'ración' : 'raciones'}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[12px] font-extrabold tabular-nums text-ink">
          {m.hasEstimate ? '≈' : ''}{m.kcal}<span className="text-[9px] font-bold text-ink-muted ml-0.5">kcal</span>
        </p>
        <p className="text-[9px] text-ink-muted">P{m.protein} · C{m.carbs} · G{m.fat}</p>
      </div>
    </div>
  );
}

function WeekView({ total, bySlot }: { total: MacrosSum; bySlot: WeeklyMacrosSlotRow[] }) {
  const m = roundMacros(total);
  const daysWithFood = new Set(bySlot.map((s) => s.day)).size;
  const dailyAvg = daysWithFood > 0 ? Math.round(m.kcal / daysWithFood) : 0;

  return (
    <div className="flex flex-col gap-3">
      <MacrosCard macros={total} title="Total semana" subtitle={daysWithFood ? `~${dailyAvg.toLocaleString('es-ES')} kcal/día (${daysWithFood} ${daysWithFood === 1 ? 'día con plan' : 'días con plan'})` : 'Sin recetas planificadas'} />

      <div className="rounded-card bg-white p-4 shadow-card">
        <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          <Activity size={11} strokeWidth={2} aria-hidden /> Desglose por sesiones planificadas
        </p>
        {bySlot.length === 0 ? (
          <p className="text-[12px] text-ink-muted">Aún no hay nada planificado esta semana.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bySlot.map((row, i) => (
              <SlotChip key={`${row.day}-${row.slot}-${i}`} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayView({ byDay, bySlot }: { byDay: Record<MealDay, MacrosSum>; bySlot: WeeklyMacrosSlotRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {DAY_ORDER.map((d) => {
        const macros = byDay[d];
        const rounded = roundMacros(macros);
        const dayRows = bySlot.filter((s) => s.day === d);
        if (rounded.kcal === 0) {
          return (
            <div key={d} className="rounded-card bg-ink-soft/30 p-3 shadow-action">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">{DAY_LABELS[d]}</p>
              <p className="mt-0.5 text-[12px] text-ink-muted">Sin plan</p>
            </div>
          );
        }
        return (
          <div key={d} className="rounded-card bg-white p-4 shadow-card">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">{DAY_LABELS[d]}</p>
              <p className="text-[16px] font-extrabold tabular-nums text-ink">
                {rounded.hasEstimate ? '≈ ' : ''}{rounded.kcal.toLocaleString('es-ES')}<span className="text-[10px] font-bold text-ink-muted ml-0.5">kcal</span>
              </p>
            </div>
            <p className="text-[10px] text-ink-muted">P{rounded.protein} · C{rounded.carbs} · G{rounded.fat}</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {dayRows.map((row, i) => <SlotChip key={`${row.slot}-${i}`} row={row} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MealView({ byMeal, bySlot }: { byMeal: Record<MealSlot, MacrosSum>; bySlot: WeeklyMacrosSlotRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {SLOT_ORDER.map((slot) => {
        const macros = byMeal[slot];
        const rounded = roundMacros(macros);
        const slotRows = bySlot.filter((s) => s.slot === slot);
        if (rounded.kcal === 0) return null;
        return (
          <div key={slot} className="rounded-card bg-white p-4 shadow-card">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">{mealSlotLabel(slot)}</p>
              <p className="text-[16px] font-extrabold tabular-nums text-ink">
                {rounded.hasEstimate ? '≈ ' : ''}{rounded.kcal.toLocaleString('es-ES')}<span className="text-[10px] font-bold text-ink-muted ml-0.5">kcal</span>
              </p>
            </div>
            <p className="text-[10px] text-ink-muted">P{rounded.protein} · C{rounded.carbs} · G{rounded.fat}</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {slotRows.map((row, i) => <SlotChip key={`${row.day}-${i}`} row={row} />)}
            </div>
          </div>
        );
      })}
      {Object.values(byMeal).every((m) => roundMacros(m).kcal === 0) && (
        <p className="py-6 text-center text-[12px] text-ink-muted">Nada planificado todavía.</p>
      )}
    </div>
  );
}
