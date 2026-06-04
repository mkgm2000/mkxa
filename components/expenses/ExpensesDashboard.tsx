'use client';

import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import clsx from 'clsx';
import { StatCard } from './StatCard';
import { TrendChart } from './TrendChart';
import { useExpensesStats } from '@/lib/hooks/use-expenses-stats';
import { categoryLabel, formatEuros, type Category } from '@/lib/expenses';

// Kept in sync with components/home/GastosCard.tsx — single source of truth
// for the category palette across the app.
const CAT_COLORS: Record<Category, string> = {
  comida:        '#77d6bd',
  casa:          '#b587fb',
  transporte:    '#a3bcff',
  ocio:          '#fed282',
  salud:         '#ff8a8e',
  suscripciones: '#c4a3ff',
  otros:         '#d6cfc1',
};

function formatPct(p: number): string {
  const sign = p > 0 ? '+' : '';
  return `${sign}${p.toFixed(0)}%`;
}

function formatEurNoDecimals(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

/**
 * Top-of-page dashboard for /expenses.
 *
 * Stats (read-only, no schema changes):
 *  1. Hero — total this month + % vs last month (arrow + colour).
 *  2. Top category badge + previous top.
 *  3. Daily average (this vs last month).
 *  4. Category breakdown — top 5 horizontal bars as % of monthly total.
 *  5. 6-month trend line (SVG) highlighting current month.
 *  6. MK vs Xabi split (uses `paid_by`).
 *
 * Skipped: monthly budget. The expenses table has no `budget` column
 * (see `supabase/migrations/20260528120100_expenses_and_storage.sql`).
 */
export function ExpensesDashboard() {
  const stats = useExpensesStats();
  const {
    loading,
    currentTotal,
    previousTotal,
    pctChange,
    currentDailyAvg,
    previousDailyAvg,
    currentTopCategory,
    previousTopCategory,
    currentByCategory,
    trend,
    paidBy,
  } = stats;

  const heroAccent = currentTopCategory ? CAT_COLORS[currentTopCategory] : '#fed282';

  const monthLabel = useMemo(
    () => new Date().toLocaleString('es-ES', { month: 'long' }),
    [],
  );

  // % change arrow + colour.
  // Spending intuition: less spent than last month = green (good),
  // more spent = red. Within ±5% is treated as flat / neutral.
  const pctView = useMemo(() => {
    if (pctChange == null) {
      return {
        label: 'sin mes pasado',
        Icon: Minus,
        color: 'text-ink-muted',
        bg: 'bg-white/70',
      };
    }
    const abs = Math.abs(pctChange);
    if (abs <= 5) {
      return {
        label: formatPct(pctChange),
        Icon: Minus,
        color: 'text-ink-muted',
        bg: 'bg-white/70',
      };
    }
    if (pctChange < 0) {
      return {
        label: formatPct(pctChange),
        Icon: ArrowDownRight,
        color: 'text-[#1f8c5e]',
        bg: 'bg-[#dff5ea]',
      };
    }
    return {
      label: formatPct(pctChange),
      Icon: ArrowUpRight,
      color: 'text-[#b5391d]',
      bg: 'bg-[#ffdcd1]',
    };
  }, [pctChange]);

  const top5 = currentByCategory.slice(0, 5);
  const top5Max = top5[0]?.total ?? 0;

  const payerTotal = paidBy.MK + paidBy.Xabi + paidBy.Compartido;
  const payerPct = (v: number) => (payerTotal > 0 ? (v / payerTotal) * 100 : 0);

  if (loading) {
    return (
      <section
        aria-label="Resumen de gastos"
        className="rounded-card bg-white/70 p-6 text-center text-sm text-ink-muted shadow-card"
      >
        Cargando resumen…
      </section>
    );
  }

  if (currentTotal === 0 && previousTotal === 0 && trend.every((t) => t.total === 0)) {
    return (
      <section
        aria-label="Resumen de gastos"
        className="rounded-card bg-white/70 p-6 text-center text-sm text-ink-muted shadow-card"
      >
        Aún no hay gastos para mostrar tendencias.
      </section>
    );
  }

  const PctIcon = pctView.Icon;

  return (
    <section aria-label="Resumen de gastos" className="flex flex-col gap-3">
      {/* Hero — total mes + % */}
      <div
        className="flex flex-col gap-3 rounded-card p-5 shadow-card"
        style={{
          background: `linear-gradient(160deg, ${heroAccent}66 0%, ${heroAccent}22 100%)`,
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Total {monthLabel}
          </p>
          <span
            className={clsx(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
              pctView.bg,
              pctView.color,
            )}
          >
            <PctIcon size={12} strokeWidth={2.5} aria-hidden />
            {pctView.label}
          </span>
        </div>
        <p className="font-sans text-[44px] font-extrabold leading-none tracking-tightest tabular-nums text-ink">
          {formatEuros(currentTotal)}
        </p>
        <p className="text-[11px] font-medium text-ink-muted">
          Mes pasado: <span className="tabular-nums">{formatEuros(previousTotal)}</span>
        </p>
      </div>

      {/* 2-col: media diaria + categoría líder */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          eyebrow="Media diaria"
          value={formatEurNoDecimals(currentDailyAvg)}
          hint={
            previousDailyAvg > 0 ? (
              <span>
                vs <span className="tabular-nums">{formatEurNoDecimals(previousDailyAvg)}</span>{' '}
                el mes pasado
              </span>
            ) : (
              'sin referencia anterior'
            )
          }
        />

        <StatCard
          eyebrow="Categoría líder"
          value={currentTopCategory ? categoryLabel(currentTopCategory) : '—'}
          accent={currentTopCategory ? CAT_COLORS[currentTopCategory] : undefined}
          trailing={
            currentTopCategory ? (
              <span
                aria-hidden
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: CAT_COLORS[currentTopCategory] }}
              />
            ) : null
          }
          hint={
            previousTopCategory && previousTopCategory !== currentTopCategory ? (
              <span>
                el mes pasado lideró{' '}
                <strong className="font-bold text-ink">
                  {categoryLabel(previousTopCategory)}
                </strong>
              </span>
            ) : previousTopCategory ? (
              <span>también lideró el mes pasado</span>
            ) : null
          }
        />
      </div>

      {/* Tendencia 6 meses */}
      <div className="flex flex-col gap-2 rounded-card bg-white/70 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Tendencia 6 meses
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Mes actual destacado
          </p>
        </div>
        <TrendChart data={trend} />
      </div>

      {/* Gasto por categoría — top 5 horizontal bars */}
      {top5.length > 0 && (
        <div className="flex flex-col gap-3 rounded-card bg-white/70 p-4 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Gasto por categoría
          </p>
          <ul className="flex flex-col gap-2">
            {top5.map(({ category, total }) => {
              const widthPct = top5Max > 0 ? (total / top5Max) * 100 : 0;
              const sharePct = currentTotal > 0 ? (total / currentTotal) * 100 : 0;
              return (
                <li key={category} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[12px] font-semibold text-ink">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: CAT_COLORS[category] }}
                      />
                      {categoryLabel(category)}
                    </span>
                    <span className="tabular-nums text-ink-muted">
                      {formatEurNoDecimals(total)}{' '}
                      <span className="text-[10px]">({sharePct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-soft/40">
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: CAT_COLORS[category],
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* MK vs Xabi split */}
      {payerTotal > 0 && (
        <div className="flex flex-col gap-3 rounded-card bg-white/70 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
              MK vs Xabi
            </p>
            {paidBy.Compartido > 0 && (
              <p className="text-[10px] font-medium text-ink-muted">
                Compartido:{' '}
                <span className="font-bold text-ink tabular-nums">
                  {formatEurNoDecimals(paidBy.Compartido)}
                </span>
              </p>
            )}
          </div>

          <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-soft/40">
            <div
              className="h-full transition-[width] duration-500 ease-out"
              style={{ width: `${payerPct(paidBy.MK)}%`, backgroundColor: '#ffa3bc' }}
              aria-hidden
            />
            <div
              className="h-full transition-[width] duration-500 ease-out"
              style={{ width: `${payerPct(paidBy.Xabi)}%`, backgroundColor: '#a3bcff' }}
              aria-hidden
            />
            <div
              className="h-full transition-[width] duration-500 ease-out"
              style={{ width: `${payerPct(paidBy.Compartido)}%`, backgroundColor: '#d6cfc1' }}
              aria-hidden
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: '#ffa3bc' }} />
                MK
              </span>
              <span className="font-sans font-extrabold tabular-nums text-ink">
                {formatEurNoDecimals(paidBy.MK)}
              </span>
              <span className="text-[10px] text-ink-muted tabular-nums">
                {payerPct(paidBy.MK).toFixed(0)}%
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: '#a3bcff' }} />
                Xabi
              </span>
              <span className="font-sans font-extrabold tabular-nums text-ink">
                {formatEurNoDecimals(paidBy.Xabi)}
              </span>
              <span className="text-[10px] text-ink-muted tabular-nums">
                {payerPct(paidBy.Xabi).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
