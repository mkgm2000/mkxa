'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useExpenses } from '@/lib/hooks/use-expenses';
import { categoryLabel } from '@/lib/expenses';
import type { Category } from '@/lib/expenses';

function monthRange(): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
  const label = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  return { from, to, label };
}

const CAT_COLORS: Record<Category, string> = {
  comida: '#77d6bd',
  casa: '#b587fb',
  transporte: '#a3bcff',
  ocio: '#fed282',
  salud: '#ff8a8e',
  suscripciones: '#c4a3ff',
  otros: '#d6cfc1',
};

export function WidgetExpenseMonth() {
  const { from, to, label } = useMemo(monthRange, []);
  const { totalByCategory, total } = useExpenses({ from, to });

  const ranked = useMemo(() => {
    const entries = Object.entries(totalByCategory) as [Category, number | undefined][];
    return entries
      .filter((e): e is [Category, number] => typeof e[1] === 'number' && e[1] > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [totalByCategory]);

  return (
    <Link
      href="/expenses"
      className="block rounded-card bg-white p-4 shadow-card transition-transform duration-150 active:scale-[0.99]"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        Gasto del mes
      </p>
      <p className="mt-1 font-sans text-[24px] font-extrabold tabular-nums text-ink">
        €{total.toFixed(2)}
      </p>
      <p className="mt-0.5 text-[11px] capitalize text-ink-muted">{label}</p>

      {ranked.length > 0 && total > 0 && (
        <>
          <div
            className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-ink-soft/30"
            role="img"
            aria-label="Desglose por categoría"
          >
            {ranked.map(([cat, val]) => (
              <span
                key={cat}
                className="h-full"
                style={{
                  width: `${(val / total) * 100}%`,
                  backgroundColor: CAT_COLORS[cat],
                }}
                aria-hidden
              />
            ))}
          </div>

          <ul className="mt-3 flex flex-col gap-1.5">
            {ranked.slice(0, 4).map(([cat, val]) => (
              <li key={cat} className="flex items-center gap-2 text-[12px]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CAT_COLORS[cat] }}
                  aria-hidden
                />
                <span className="flex-1 truncate font-medium text-ink">
                  {categoryLabel(cat)}
                </span>
                <span className="tabular-nums font-medium text-ink-muted">
                  €{val.toFixed(2)}
                </span>
                <span className="w-9 text-right tabular-nums text-[11px] text-ink-muted">
                  {Math.round((val / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Link>
  );
}
