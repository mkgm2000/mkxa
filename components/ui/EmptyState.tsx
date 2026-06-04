'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateCTA {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  ariaLabel?: string;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  ctas?: EmptyStateCTA[];
  /** Tighter padding + smaller type for dropdowns/popovers (e.g. NotificationBell). */
  compact?: boolean;
  /** Optional extra classes on the outer container. */
  className?: string;
}

// Shared empty-state card. Used everywhere a list/grid is empty so the user
// sees a clear "what to do next" instead of a bare sentence.
//
// Visual:
//   - rounded-card bg-white shadow-card on a normal-size card
//   - circular icon chip (h-14 w-14) above the title
//   - bold title (16px) + muted subtitle (12px, max-w 260px)
//   - up to 2 CTA buttons side-by-side (primary = bg-ink, secondary = outlined)
//
// In `compact` mode we drop the icon chip, shrink the title and remove CTAs —
// designed to slot inside a dropdown like the notification bell.
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  ctas,
  compact = false,
  className,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className={clsx('flex flex-col items-center gap-1 px-5 py-6 text-center', className)}>
        <p className="font-sans text-[13px] font-extrabold text-ink">{title}</p>
        {subtitle && (
          <p className="max-w-[240px] text-[12px] text-ink-muted">{subtitle}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-3 rounded-card bg-white p-6 text-center shadow-card',
        className,
      )}
    >
      {Icon && (
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-soft/40 text-ink-muted"
          aria-hidden
        >
          <Icon size={24} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="font-sans text-[16px] font-extrabold leading-tight text-ink">
        {title}
      </h3>
      {subtitle && (
        <p className="max-w-[260px] text-[12px] leading-snug text-ink-muted">{subtitle}</p>
      )}
      {ctas && ctas.length > 0 && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {ctas.map((cta, i) => (
            <CTAButton key={`${cta.label}-${i}`} cta={cta} />
          ))}
        </div>
      )}
    </div>
  );
}

function CTAButton({ cta }: { cta: EmptyStateCTA }) {
  const variant = cta.variant ?? 'primary';
  const className = clsx(
    'rounded-action px-4 py-2.5 text-[13px] font-bold transition-transform duration-150 active:scale-95',
    variant === 'primary'
      ? 'bg-ink text-white shadow-action'
      : 'border border-ink-soft bg-white text-ink',
  );
  if (cta.href) {
    return (
      <Link href={cta.href} className={className} aria-label={cta.ariaLabel}>
        {cta.label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={cta.onClick}
      className={className}
      aria-label={cta.ariaLabel}
    >
      {cta.label}
    </button>
  );
}
