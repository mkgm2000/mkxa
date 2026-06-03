'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface CardData {
  key: string;
  href?: string;
  /** Big image at the top of the card. */
  image?: string | null;
  /** Optional emoji shown as a fallback when no image. */
  fallbackEmoji?: string;
  /** Tint of the fallback background. */
  fallbackBg?: string;
  /** Pill text on top-right of the image (e.g. category). */
  badge?: string;
  /** Bottom-of-card title. */
  title: string;
  /** Optional small meta line under the title (e.g. "Comida · 30 min"). */
  meta?: string;
  /** Optional bottom-right accent (e.g. price tier, rating). */
  accent?: ReactNode;
}

interface Props {
  title: string;
  seeAllHref?: string;
  items: CardData[];
  /** Card width in CSS. Defaults to 150px to match the pet-store reference. */
  cardWidth?: number;
  emptyText?: string;
}

// Horizontal scroll card row used across /home for Recetas, Comidas semana,
// Restaurantes, etc. Visual matches the pet-store reference: image-led card
// with title + meta below, generous spacing.
export function HorizontalCardRow({
  title,
  seeAllHref,
  items,
  cardWidth = 150,
  emptyText,
}: Props) {
  if (items.length === 0 && !emptyText) return null;

  return (
    <section className="-mx-4 flex flex-col gap-2 pl-5">
      <div className="flex items-center justify-between pr-5">
        <h2 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="flex items-center gap-0.5 text-[12px] font-bold text-ink-muted"
          >
            Ver todas
            <ChevronRight size={14} strokeWidth={2} aria-hidden />
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mr-5 rounded-card bg-white p-5 text-center text-[13px] text-ink-muted shadow-card">
          {emptyText}
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 pr-5" style={{ scrollbarWidth: 'none' }}>
          {items.map((c) => (
            <CardOrLink key={c.key} item={c} width={cardWidth} />
          ))}
        </div>
      )}
    </section>
  );
}

function CardOrLink({ item, width }: { item: CardData; width: number }) {
  const inner = (
    <article
      className={clsx(
        'flex shrink-0 flex-col overflow-hidden rounded-card bg-white shadow-card transition-transform duration-150 active:scale-[0.97]',
      )}
      style={{ width }}
    >
      <div
        className="relative aspect-[4/5] w-full overflow-hidden"
        style={{ backgroundColor: item.fallbackBg ?? '#f0eee9' }}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : item.fallbackEmoji ? (
          <div className="flex h-full w-full items-center justify-center text-[56px] leading-none" aria-hidden>
            {item.fallbackEmoji}
          </div>
        ) : null}
        {item.badge && (
          <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            {item.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 font-sans text-[13px] font-extrabold leading-tight text-ink">
          {item.title}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-1">
          {item.meta && <p className="truncate text-[11px] text-ink-muted">{item.meta}</p>}
          {item.accent && <div className="shrink-0">{item.accent}</div>}
        </div>
      </div>
    </article>
  );
  return item.href ? (
    <Link href={item.href} className="shrink-0">
      {inner}
    </Link>
  ) : (
    inner
  );
}
