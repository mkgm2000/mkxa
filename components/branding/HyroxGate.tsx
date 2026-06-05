'use client';

import { useEffect, useState } from 'react';
import { HyroxCountdown } from './HyroxCountdown';
import { useAthlete } from '@/lib/athlete-context';
import { todayISO } from '@/lib/date';

const PAGE_BG = '#f0eee9';

// Bumped from v1 → v2 to force the reminder to reappear after a UX
// reset. Bump again any time we redesign the popup.
const STORAGE_KEY = 'mkxa.hyrox.seen.v4';

// Daily HYROX countdown reminder, gated like MoodGate. Each athlete
// sees it once per calendar day on first entry; tapping "Vamos"
// stamps localStorage so it doesn't reappear until tomorrow. Sits
// AFTER MoodGate in the layout — mood goes first, then the race
// reminder, then the app.

function readSeen(athlete: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[athlete] ?? null;
  } catch {
    return null;
  }
}

function stampSeen(athlete: string, date: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[athlete] = date;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch { /* quota / private mode: ignore */ }
}

export function HyroxGate({ children }: { children: React.ReactNode }) {
  const athlete = useAthlete();
  const [resolved, setResolved] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!athlete) { setResolved(true); setShow(false); return; }
    const seen = readSeen(athlete);
    setShow(seen !== todayISO());
    setResolved(true);
  }, [athlete]);

  if (!resolved) return null;

  if (show && athlete) {
    return (
      <ReminderScreen
        onDismiss={() => { stampSeen(athlete, todayISO()); setShow(false); }}
      />
    );
  }

  return <>{children}</>;
}

export function HyroxReminderScreen({
  onDismiss,
  eyebrow = 'recordatorio diario',
  ctaLabel = 'Vamos',
}: {
  onDismiss: () => void;
  eyebrow?: string;
  ctaLabel?: string;
}) {
  // Pin the html safe-area chrome to the same cream so iOS doesn't
  // paint a strip behind the status bar. Restore on unmount.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.getPropertyValue('--mood-bg');
    root.style.setProperty('--mood-bg', PAGE_BG);
    return () => {
      if (prev) root.style.setProperty('--mood-bg', prev);
      else root.style.removeProperty('--mood-bg');
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ backgroundColor: PAGE_BG }}
    >
      <section
        className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}
      >
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-ink-muted">
            {eyebrow}
          </p>
          <h1 className="font-sans text-[36px] font-extrabold leading-[1.05] tracking-tightest text-ink">
            Camino a HYROX
          </h1>
        </div>

        <HyroxCountdown hideHeader />
      </section>

      <footer
        className="flex items-center justify-center px-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', paddingTop: 16 }}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full bg-ink px-8 py-3.5 text-[13px] font-extrabold uppercase tracking-[0.18em] text-white shadow-card active:scale-95"
        >
          {ctaLabel}
        </button>
      </footer>
    </div>
  );
}

function ReminderScreen({ onDismiss }: { onDismiss: () => void }) {
  return <HyroxReminderScreen onDismiss={onDismiss} />;
}
