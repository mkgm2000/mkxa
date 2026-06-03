'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Bell, Heart, ChefHat, MapPin, Layers, Dumbbell, type LucideIcon } from 'lucide-react';
import { AvatarCircle } from '@/components/profile/AvatarCircle';
import { useActivity, markNotificationsSeen, type ActivityEvent } from '@/lib/hooks/use-activity';
import { useAthleteProfiles } from '@/lib/hooks/use-athlete-profiles';

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return `hace ${Math.floor(diff / 604800)} sem`;
}

// Colored badge per event kind — sits at the bottom-right of the avatar
// like in the reference (purple/orange/blue/green dots).
const BADGE: Record<ActivityEvent['kind'], { icon: LucideIcon; bg: string }> = {
  mood:       { icon: Heart,    bg: '#ff5d77' },
  recipe:     { icon: ChefHat,  bg: '#ff8a3d' },
  restaurant: { icon: MapPin,   bg: '#3da7ff' },
  collection: { icon: Layers,   bg: '#9a6bff' },
  training:   { icon: Dumbbell, bg: '#1d1d1f' },
};

type Filter = 'all' | 'unread';

export function NotificationBell() {
  const { events, unread, refresh } = useActivity();
  const profiles = useAthleteProfiles();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [lastSeenAtOpen, setLastSeenAtOpen] = useState<string>('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Capture the pre-open lastSeen so the "Sin leer" tab keeps working
  // inside this session — markNotificationsSeen() runs after the open.
  function handleOpen() {
    if (!open) {
      const prev = typeof window !== 'undefined'
        ? window.localStorage.getItem('mkxa:notifications:lastSeenISO') ?? ''
        : '';
      setLastSeenAtOpen(prev);
      markNotificationsSeen();
      setTimeout(() => void refresh(), 50);
    }
    setOpen((v) => !v);
  }

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = useMemo(() => {
    if (filter === 'all') return events;
    if (!lastSeenAtOpen) return events;
    return events.filter((e) => e.at > lastSeenAtOpen);
  }, [filter, events, lastSeenAtOpen]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={open}
        onClick={handleOpen}
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
          aria-label="Notificaciones"
          // Anchored under the bell, right-aligned. On small phones we clamp
          // the width so it sits inside the viewport with breathing room.
          className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-32px)] max-w-[360px] origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="font-sans text-[17px] font-extrabold tracking-tight text-ink">
              Notificaciones
            </h3>
            <div className="flex items-center gap-0.5 rounded-full bg-ink-soft/40 p-0.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={clsx(
                  'rounded-full px-3 py-1 text-[11px] font-bold transition-colors',
                  filter === 'all' ? 'bg-white text-ink shadow-action' : 'text-ink-muted',
                )}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={clsx(
                  'rounded-full px-3 py-1 text-[11px] font-bold transition-colors',
                  filter === 'unread' ? 'bg-white text-ink shadow-action' : 'text-ink-muted',
                )}
              >
                Sin leer
              </button>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12px] text-ink-muted">
              {filter === 'unread' ? 'Sin novedades.' : 'Aún no hay nada que contar.'}
            </p>
          ) : (
            <ul className="flex max-h-[60vh] flex-col divide-y divide-ink-soft/40 overflow-y-auto pb-1">
              {visible.map((e) => {
                const badge = BADGE[e.kind];
                const BadgeIcon = badge.icon;
                const isUnread = lastSeenAtOpen ? e.at > lastSeenAtOpen : false;
                const row = (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="relative shrink-0">
                      {e.athlete ? (
                        <AvatarCircle
                          athlete={e.athlete}
                          src={profiles[e.athlete]?.avatar_url ?? null}
                          size={40}
                        />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-soft text-ink"
                          aria-hidden
                        >
                          <BadgeIcon size={16} strokeWidth={1.75} />
                        </div>
                      )}
                      <span
                        aria-hidden
                        className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-white"
                        style={{ backgroundColor: badge.bg }}
                      >
                        <BadgeIcon size={11} strokeWidth={2} />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-extrabold leading-tight text-ink">
                          {e.title}
                        </p>
                        <span className="shrink-0 text-[10px] font-medium text-ink-muted">
                          {relativeTime(e.at)}
                        </span>
                      </div>
                      {e.body && (
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-muted">
                          {e.body}
                        </p>
                      )}
                    </div>
                    {isUnread && (
                      <span
                        aria-hidden
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                      />
                    )}
                  </div>
                );
                return (
                  <li key={e.id}>
                    {e.href ? (
                      <Link
                        href={e.href}
                        onClick={() => setOpen(false)}
                        className="block hover:bg-ink-soft/10 active:bg-ink-soft/20"
                      >
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
      )}
    </div>
  );
}
