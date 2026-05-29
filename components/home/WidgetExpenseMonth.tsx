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

  const top = useMemo(() => {
    const entries = Object.entries(totalByCategory) as [Category, number | undefined][];
    return entries
      .filter((e): e is [Category, number] => typeof e[1] === 'number')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [totalByCategory]);

  const max = top[0]?.[1] ?? 0;

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

      {top.length > 0 && (
        <ul className="mt-3 flex h-12 items-end gap-2">
          {top.map(([cat, val]) => (
            <li key={cat} className="flex flex-1 flex-col items-center gap-1">
              <span
                className="w-full rounded-md"
                style={{ height: max ? `${(val / max) * 32 + 4}px` : 4, backgroundColor: CAT_COLORS[cat] }}
                aria-hidden
              />
              <span className="truncate text-[9px] font-medium text-ink-muted">
                {categoryLabel(cat).slice(0, 5)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
