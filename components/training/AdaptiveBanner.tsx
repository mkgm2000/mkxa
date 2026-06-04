'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingDown, TrendingUp, AlertCircle, X, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdaptiveSuggestion, SuggestionKind } from '@/lib/training/adaptive';
import { getCurrentWeek } from '@/lib/plan-hyrox';

interface Props {
  suggestion: AdaptiveSuggestion | null;
  /** Target week the user is viewing — used to scope dismissal to "this week". */
  week: number;
  /** Where the action button navigates. Defaults to /training/adjust. */
  actionHref?: string;
}

const STORAGE_KEY = 'mkxa:training:adaptive:dismissedISO';

interface KindVisuals {
  icon: LucideIcon;
  gradient: string;
  ring: string;
  iconBg: string;
}

const VISUALS: Record<SuggestionKind, KindVisuals> = {
  'baja-intensidad': {
    icon: TrendingDown,
    gradient: 'linear-gradient(135deg, #ffe0e1 0%, #ffd1d3 100%)',
    ring: 'rgba(255,59,48,0.18)',
    iconBg: 'rgba(255,255,255,0.55)',
  },
  'sube-intensidad': {
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg, #d6f5ea 0%, #b6ecd8 100%)',
    ring: 'rgba(20,140,90,0.18)',
    iconBg: 'rgba(255,255,255,0.55)',
  },
  'replantear-volumen': {
    icon: AlertCircle,
    gradient: 'linear-gradient(135deg, #fff1d6 0%, #ffe2a8 100%)',
    ring: 'rgba(200,140,30,0.18)',
    iconBg: 'rgba(255,255,255,0.55)',
  },
};

/**
 * Soft, dismissible recommendation banner shown above the next session card.
 *
 * Dismissal stores an ISO timestamp in localStorage under
 * `mkxa:training:adaptive:dismissedISO`. The banner stays hidden until the
 * user enters a new ISO week (week number of the current date differs from
 * the week number stored at dismissal).
 */
export function AdaptiveBanner({ suggestion, week, actionHref = '/training/adjust' }: Props) {
  const [dismissed, setDismissed] = useState<boolean>(false);

  // Read dismissal on mount + when suggestion changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) { setDismissed(false); return; }
      const dismissedAt = new Date(raw);
      if (Number.isNaN(dismissedAt.getTime())) { setDismissed(false); return; }
      // Compare ISO week-of-year for dismissedAt vs now. If same week → hide.
      const sameWeek = isoWeekKey(dismissedAt) === isoWeekKey(new Date());
      setDismissed(sameWeek);
    } catch {
      setDismissed(false);
    }
  }, [suggestion?.kind]);

  const href = useMemo(() => {
    const next = Math.max(week + 1, getCurrentWeek() + 1);
    return `${actionHref}?week=${next}`;
  }, [week, actionHref]);

  if (!suggestion || dismissed) return null;

  const v = VISUALS[suggestion.kind];
  const Icon = v.icon;

  function onDismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // best-effort
    }
    setDismissed(true);
  }

  return (
    <section
      className="mx-5 rounded-card p-4 shadow-card"
      style={{ background: v.gradient, boxShadow: `0 0 0 1px ${v.ring} inset, 0 1px 0 rgba(255,255,255,0.55) inset, 0 24px 50px -28px rgba(20,24,30,0.28)` }}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-action"
          style={{ background: v.iconBg }}
          aria-hidden
        >
          <Icon size={20} strokeWidth={1.75} className="text-ink" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-sans text-[15px] font-extrabold leading-tight tracking-tightest text-ink">
              {suggestion.title}
            </h2>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Descartar sugerencia"
              className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink"
            >
              <X size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-ink">
            {suggestion.body}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-action bg-ink px-3.5 py-2 text-[12px] font-semibold text-white shadow-action transition-transform duration-150 active:scale-95"
            >
              {suggestion.actionLabel}
              <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Returns a stable ISO-week key like "2026-W23" for a given date.
 * Used to compare "same week" for the dismissal window without pulling in
 * a date lib.
 */
function isoWeekKey(d: Date): string {
  // ISO week: Thursday-anchored.
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
