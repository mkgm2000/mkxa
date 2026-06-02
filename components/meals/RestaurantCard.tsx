'use client';

import { MapPin, Star, Pencil, Check } from 'lucide-react';
import {
  cuisineMeta,
  formatVisitedAt,
  type Restaurant,
} from '@/lib/meals/restaurants';

interface Props {
  r: Restaurant;
  onEdit: (r: Restaurant) => void;
  onMarkVisited?: (r: Restaurant) => void;
}

export function RestaurantCard({ r, onEdit, onMarkVisited }: Props) {
  const c = cuisineMeta(r.cuisine);
  const visited = r.status === 'visited';

  return (
    <article
      className="relative overflow-hidden rounded-card bg-white shadow-card"
      style={{ borderLeft: `4px solid ${c.color}` }}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[24px]"
          style={{ backgroundColor: `${c.color}1A` }}
          aria-hidden
        >
          {c.emoji}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-sans text-[15px] font-extrabold leading-tight text-ink">
            {r.name}
          </h3>
          <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wider" style={{ color: c.color }}>
            {c.label}
            {r.price_tier && <span className="ml-2 text-ink-muted">{r.price_tier}</span>}
          </p>
          {r.location && (
            <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-ink-muted">
              <MapPin size={11} strokeWidth={1.5} aria-hidden />
              <span className="truncate">{r.location}</span>
            </p>
          )}
          {visited && r.rating != null && (
            <div className="mt-1.5 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  strokeWidth={1.5}
                  className={i < (r.rating ?? 0) ? 'text-amber-400' : 'text-ink-soft'}
                  fill={i < (r.rating ?? 0) ? 'currentColor' : 'none'}
                  aria-hidden
                />
              ))}
            </div>
          )}
          {visited && r.visited_at && (
            <p className="mt-1 text-[11px] text-ink-muted">Visitado {formatVisitedAt(r.visited_at)}</p>
          )}
          {r.notes && (
            <p className="mt-1.5 line-clamp-2 text-[12px] text-ink">{r.notes}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {r.added_by && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: r.added_by === 'MK' ? '#E83E5C' : '#3F7DBF' }}
            >
              {r.added_by}
            </span>
          )}
          <button
            type="button"
            aria-label="Editar restaurante"
            onClick={() => onEdit(r)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-soft text-ink active:scale-95"
          >
            <Pencil size={12} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>

      {!visited && onMarkVisited && (
        <button
          type="button"
          onClick={() => onMarkVisited(r)}
          aria-label={`Marcar ${r.name} como visitado`}
          className="flex w-full items-center justify-center gap-1.5 border-t border-ink-soft/40 py-2.5 text-[13px] font-bold text-ink transition-colors active:bg-ink-soft/40"
          style={{ backgroundColor: `${c.color}10` }}
        >
          <Check size={14} strokeWidth={2.2} aria-hidden />
          Marcar como visitado
        </button>
      )}
    </article>
  );
}
