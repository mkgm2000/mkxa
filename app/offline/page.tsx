import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sin conexión · mkxa',
  description: 'Estás sin conexión. Reintenta cuando vuelvas a tener red.',
};

/**
 * Offline fallback page.
 *
 * Served by the service worker (via `fallbacks.document` in next.config.mjs)
 * when the user tries to navigate to a page that:
 *   1. Has not been cached yet, AND
 *   2. The network is unavailable.
 *
 * Pure server component — no auth, no Supabase, no data fetching — so it
 * renders even if every external dependency is unreachable.
 */
export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-[#f0eee9]">
      <div className="w-full max-w-sm rounded-card bg-white shadow-card p-8 flex flex-col items-center text-center gap-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/5 text-ink">
          <WifiOff size={32} strokeWidth={1.5} aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold tracking-tightest text-ink">Sin conexión</h1>
          <p className="text-sm text-ink-muted leading-snug">
            No hemos podido cargar la página. Comprueba tu red e inténtalo de nuevo.
          </p>
        </div>
        <Link
          href="/home"
          className="mt-1 inline-flex items-center justify-center rounded-action bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-action transition active:scale-[0.98]"
        >
          Reintentar
        </Link>
      </div>
    </main>
  );
}
