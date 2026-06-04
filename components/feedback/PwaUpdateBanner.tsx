'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * PwaUpdateBanner
 *
 * Detects when a new service worker version has been installed and is waiting
 * to activate. Shows a small sticky banner with a "Recargar" button.
 *
 * Detection:
 *  - On mount, get the current SW registration.
 *  - If `registration.waiting` already exists, a new SW is staged — show banner.
 *  - Otherwise, listen for `updatefound` → the new SW's `statechange` to "installed"
 *    while there is already an active controller (= true update, not first install).
 *
 * Behaviour:
 *  - "Recargar" tells the waiting SW to skipWaiting (next-pwa already sets
 *    skipWaiting:true in workboxOptions, so a hard reload is the simplest path
 *    that reliably gives the user the new bundle on iOS Safari + Chrome).
 *  - "✕" dismisses for this session. Next reload, if a new SW is still waiting,
 *    the banner shows again.
 *
 * NOT shown:
 *  - In dev (SW is disabled via next.config.mjs).
 *  - On the first install (no controller yet → not an "update").
 */
export function PwaUpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;

    const onWaiting = (reg: ServiceWorkerRegistration) => {
      if (cancelled) return;
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaiting(reg.waiting);
      }
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg || cancelled) return;

      // Already-waiting SW from a previous session.
      onWaiting(reg);

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') onWaiting(reg);
        });
      });
    });

    // If a new SW takes control while the page is open, reload to load fresh assets.
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!waiting || dismissed) return null;

  const reload = () => {
    // Ask the waiting SW to take over. `controllerchange` listener will then reload.
    waiting.postMessage({ type: 'SKIP_WAITING' });
    // Fallback: if controllerchange never fires (some browsers), force-reload after a tick.
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 inset-x-4 z-50 flex items-center gap-3 rounded-card bg-ink/95 px-4 py-3 text-white shadow-card backdrop-blur supports-[backdrop-filter]:bg-ink/85"
    >
      <RefreshCw size={18} strokeWidth={1.75} aria-hidden className="shrink-0 opacity-90" />
      <p className="flex-1 text-sm leading-snug">
        Hay una versión nueva. <span className="opacity-70">¿Recargar?</span>
      </p>
      <button
        type="button"
        onClick={reload}
        className="rounded-action bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-action transition active:scale-[0.97]"
      >
        Recargar
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Descartar aviso de actualización"
        className="rounded-full p-1 text-white/70 transition hover:text-white"
      >
        <X size={16} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
