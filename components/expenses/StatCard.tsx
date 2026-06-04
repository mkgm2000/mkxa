'use client';

import { type ReactNode } from 'react';
import clsx from 'clsx';

export interface StatCardProps {
  /** Small uppercase eyebrow label. */
  eyebrow: string;
  /** Big primary value, already formatted. */
  value: string;
  /** Optional secondary line below the value. */
  hint?: ReactNode;
  /** Trailing slot — % badge, top category badge, etc. */
  trailing?: ReactNode;
  /** Optional background gradient color (hex). */
  accent?: string;
  className?: string;
}

/**
 * Reusable big-number stat card for the expenses dashboard.
 * Mirrors the `GastosCard` aesthetic so it feels native.
 */
export function StatCard({
  eyebrow,
  value,
  hint,
  trailing,
  accent,
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-2 rounded-card p-4 shadow-card',
        className,
      )}
      style={
        accent
          ? { background: `linear-gradient(160deg, ${accent}55 0%, ${accent}1f 100%)` }
          : { background: 'rgba(255,255,255,0.65)' }
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          {eyebrow}
        </p>
        {trailing}
      </div>
      <p className="font-sans text-[26px] font-extrabold leading-none tabular-nums text-ink">
        {value}
      </p>
      {hint != null && (
        <div className="text-[11px] font-medium text-ink-muted">{hint}</div>
      )}
    </div>
  );
}
