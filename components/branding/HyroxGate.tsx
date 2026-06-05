'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { HyroxCountdown } from './HyroxCountdown';
import { useAthlete } from '@/lib/athlete-context';
import { todayISO } from '@/lib/date';

const STORAGE_KEY = 'mkxa.hyrox.seen';

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

function ReminderScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <main
      className="flex min-h-dvh w-full flex-col bg-[#f0eee9]"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      }}
    >
      <header className="flex items-start justify-between px-5">
        <span aria-hidden className="h-10 w-10" />
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Entendido"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95"
        >
          <Check size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
        </button>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-ink-muted">
            recordatorio diario
          </p>
          <h1 className="font-sans text-[36px] font-extrabold leading-[1.05] tracking-tightest text-ink">
            Camino a HYROX
          </h1>
        </div>

        <HyroxCountdown hideHeader />

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full bg-ink px-7 py-3 text-[13px] font-extrabold uppercase tracking-[0.18em] text-white active:scale-95"
        >
          Vamos
        </button>
      </section>
    </main>
  );
}
