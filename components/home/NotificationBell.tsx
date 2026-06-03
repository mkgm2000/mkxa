'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, X, Heart, ChefHat, MapPin, Layers, Dumbbell, type LucideIcon } from 'lucide-react';
import { useActivity, markNotificationsSeen, type ActivityEvent } from '@/lib/hooks/use-activity';

const TIME_UNITS: [number, string, string][] = [
  [60, 'segundo', 'segundos'],
  [60, 'minuto', 'minutos'],
  [24, 'hora', 'horas'],
  [7, 'día', 'días'],
  [4.34, 'semana', 'semanas'],
  [12, 'mes', 'meses'],
  [Number.POSITIVE_INFINITY, 'año', 'años'],
];

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 30) return 'ahora';
  let value = diff;
  let unitLabelSingular = 'segundo';
  let unitLabelPlural = 'segundos';
  for (const [factor, singular, plural] of TIME_UNITS) {
    if (value < factor) {
      unitLabelSingular = singular;
      unitLabelPlural = plural;
      break;
    }
    value /= factor;
    unitLabelSingular = singular;
    unitLabelPlural = plural;
  }
  const n = Math.floor(value);
  return `hace ${n} ${n === 1 ? unitLabelSingular : unitLabelPlural}`;
}

const ICON: Record<ActivityEvent['kind'], LucideIcon> = {
  mood: Heart,
  recipe: ChefHat,
  restaurant: MapPin,
  collection: Layers,
  training: Dumbbell,
};

export function NotificationBell() {
  const { events, unread, refresh } = useActivity();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function k(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  function openSheet() {
    setOpen(true);
    markNotificationsSeen();
    // Force the unread count to refresh after the lastSeen mark.
    setTimeout(() => void refresh(), 50);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Notificaciones"
        onClick={openSheet}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95"
      >
        <Bell size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
        {unread > 0 && (
          <span
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-white"
            aria-label={`${unread} sin leer`}
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Notificaciones"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-ink-soft/40 p-4">
              <h3 className="font-sans text-[18px] font-extrabold text-ink">Notificaciones</h3>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
              >
                <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
              </button>
            </div>

            {events.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-ink-muted">
                Aún no hay nada que contar.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-ink-soft/40 overflow-y-auto">
                {events.map((e) => {
                  const Icon = ICON[e.kind];
                  const row = (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-soft text-ink"
                        aria-hidden
                      >
                        <Icon size={16} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink">{e.text}</p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">{relativeTime(e.at)}</p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={e.id}>
                      {e.href ? (
                        <Link href={e.href} onClick={() => setOpen(false)} className="block hover:bg-ink-soft/20 active:bg-ink-soft/40">
                          {row}
                        </Link>
                      ) : (
                        row
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
