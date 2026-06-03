'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Wallet } from 'lucide-react';
import { useExpenses } from '@/lib/hooks/use-expenses';
import { categoryLabel, type Category } from '@/lib/expenses';

const CAT_COLORS: Record<Category, string> = {
  comida:        '#77d6bd',
  casa:          '#b587fb',
  transporte:    '#a3bcff',
  ocio:          '#fed282',
  salud:         '#ff8a8e',
  suscripciones: '#c4a3ff',
  otros:         '#d6cfc1',
};

function monthRange() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return {
    from: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10),
    label: now.toLocaleString('es-ES', { month: 'long' }),
  };
}

// Compact expenses card for /home. Big total in a coloured pill, a strip
// of dots underneath showing the category mix. Lives in the 2-col row
// next to the training hero so the page stays visually anchored.
export function GastosCard() {
  const { from, to, label } = useMemo(monthRange, []);
  const { totalByCategory, total } = useExpenses({ from, to });

  const eur = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(total || 0);

  const ranked = useMemo(() => {
    const entries = Object.entries(totalByCategory) as [Category, number | undefined][];
    return entries
      .filter((e): e is [Category, number] => typeof e[1] === 'number' && e[1] > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [totalByCategory]);

  // Gradient pulled from the top category so the card colour matches what
  // the user is actually spending on. Falls back to a warm gold for empty
  // months so the card never looks dead.
  const heroColor = ranked[0] ? CAT_COLORS[ranked[0][0]] : '#fed282';

  return (
    <Link
      href="/expenses"
      className="flex flex-col gap-2 rounded-card p-4 shadow-card transition-transform duration-150 active:scale-[0.99]"
      style={{
        background: `linear-gradient(160deg, ${heroColor}66 0%, ${heroColor}22 100%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          <Wallet size={11} strokeWidth={1.75} aria-hidden />
          {label}
        </p>
        <ArrowUpRight size={14} strokeWidth={2} className="text-ink-muted" aria-hidden />
      </div>
      <p className="font-sans text-[26px] font-extrabold leading-none tabular-nums text-ink">
        {eur}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {ranked.length === 0 ? (
          <p className="text-[11px] text-ink-muted">Sin gastos este mes</p>
        ) : (
          ranked.map(([cat, amount]) => (
            <span
              key={cat}
              className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CAT_COLORS[cat] }}
              />
              {categoryLabel(cat)} · €{Math.round(amount)}
            </span>
          ))
        )}
      </div>
    </Link>
  );
}
