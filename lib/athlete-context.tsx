'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { create } from 'zustand';

export type Athlete = 'MK' | 'Xabi';

const STORE_KEY = 'mkxa.athlete';

interface AthleteStore {
  athlete: Athlete | null;
  setAthlete: (a: Athlete | null) => void;
}

export const athleteStore = create<AthleteStore>((set) => ({
  athlete: null,
  setAthlete: (a) => {
    if (typeof window !== 'undefined') {
      if (a === null) window.localStorage.removeItem(STORE_KEY);
      else window.localStorage.setItem(STORE_KEY, a);
    }
    set({ athlete: a });
  },
}));

const AthleteCtx = createContext<Athlete | null>(null);

export function AthleteProvider({ children }: { children: React.ReactNode }) {
  const athlete = athleteStore((s) => s.athlete);
  const set     = athleteStore((s) => s.setAthlete);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    const stored = window.localStorage.getItem(STORE_KEY);
    if (stored === 'MK' || stored === 'Xabi') set(stored);
    setHydrated(true);
  }, [hydrated, set]);

  return <AthleteCtx.Provider value={athlete}>{children}</AthleteCtx.Provider>;
}

export function useAthlete(): Athlete | null {
  return useContext(AthleteCtx);
}

/**
 * Synchronously read the persisted athlete straight from localStorage.
 * Useful for client components that need to decide before the provider's
 * hydration effect has run (e.g. gating a redirect to /pick). Returns null
 * on the server or when nothing valid is stored.
 */
export function getStoredAthlete(): Athlete | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORE_KEY);
  return stored === 'MK' || stored === 'Xabi' ? stored : null;
}

export function setAthlete(a: Athlete | null) {
  athleteStore.getState().setAthlete(a);
}
