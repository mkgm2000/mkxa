'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface CookTimerControls {
  status: TimerStatus;
  remaining: number; // seconds
  total: number;     // seconds
  start: () => void;
  pause: () => void;
  reset: () => void;
  setMinutes: (m: number) => void;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  released?: boolean;
}

function chime(): void {
  try {
    type WindowWithAudio = Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const w = window as WindowWithAudio;
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.85);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    /* ignore */
  }
}

function notify(title: string): void {
  try {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title);
    }
  } catch {
    /* ignore */
  }
}

export function requestTimerPermissions(): void {
  try {
    if (typeof window === 'undefined') return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export function useCookTimer(initialMinutes: number | null | undefined): CookTimerControls {
  const initial = Math.max(0, Math.round((initialMinutes ?? 0) * 60));
  const [total, setTotal] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    // If parent passes a new initialMinutes, reset.
    setTotal(initial);
    setRemaining(initial);
    setStatus('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const clearTick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const releaseWake = useCallback(async () => {
    try {
      if (wakeRef.current && !wakeRef.current.released) {
        await wakeRef.current.release();
      }
    } catch {
      /* ignore */
    }
    wakeRef.current = null;
  }, []);

  const requestWake = useCallback(async () => {
    try {
      type NavLike = Navigator & {
        wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> };
      };
      const nav = navigator as NavLike;
      if (nav.wakeLock?.request) {
        wakeRef.current = await nav.wakeLock.request('screen');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(() => {
    if (total <= 0) return;
    if (status === 'finished') {
      setRemaining(total);
    }
    setStatus('running');
    requestTimerPermissions();
    requestWake();
    clearTick();
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearTick();
          chime();
          notify('Tiempo terminado');
          releaseWake();
          setStatus('finished');
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }, [total, status, releaseWake, requestWake]);

  const pause = useCallback(() => {
    if (status !== 'running') return;
    clearTick();
    releaseWake();
    setStatus('paused');
  }, [status, releaseWake]);

  const reset = useCallback(() => {
    clearTick();
    releaseWake();
    setRemaining(total);
    setStatus('idle');
  }, [total, releaseWake]);

  const setMinutes = useCallback((m: number) => {
    clearTick();
    releaseWake();
    const secs = Math.max(0, Math.round(m * 60));
    setTotal(secs);
    setRemaining(secs);
    setStatus('idle');
  }, [releaseWake]);

  useEffect(() => {
    return () => {
      clearTick();
      releaseWake();
    };
  }, [releaseWake]);

  return { status, remaining, total, start, pause, reset, setMinutes };
}

export function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
