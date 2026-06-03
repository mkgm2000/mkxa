'use client';

import { useEffect } from 'react';
import { X, MapPin, Navigation, Copy } from 'lucide-react';
import { saveState } from '@/lib/save-state';

interface Props {
  name: string;
  location: string;
  onClose: () => void;
}

// Bottom sheet that lets the user jump to the restaurant's location in
// Google Maps or Waze. Uses universal HTTPS links — both Apple Maps,
// Google Maps, and Waze on iOS/Android claim those automatically when
// installed and otherwise fall back to the in-browser map.
export function RestaurantNavSheet({ name, location, onClose }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function k(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  // Universal search URL — works in browser AND deep-links to the installed
  // app on mobile. iOS Safari + the OS handler decides which native app to
  // open. We include the restaurant name in the query so Maps disambiguates
  // when an address is generic (e.g. "Ruzafa").
  const query = encodeURIComponent(`${name} ${location}`);
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const waze = `https://www.waze.com/ul?q=${query}`;

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(location);
      saveState.getState().set('saved');
    } catch {
      saveState.getState().set('error');
    }
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Cómo ir a ${name}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-sans text-[18px] font-extrabold text-ink">
              Cómo ir
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-ink-muted">
              <MapPin size={12} strokeWidth={1.5} aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
          >
            <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <a
            href={gmaps}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setTimeout(onClose, 50)}
            className="flex items-center gap-3 rounded-action border border-ink-soft bg-white px-4 py-3 text-left text-[14px] font-bold text-ink active:scale-[0.98]"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: '#4285F4' }}
              aria-hidden
            >
              <MapPin size={18} strokeWidth={2} />
            </span>
            <span className="flex flex-col">
              <span>Google Maps</span>
              <span className="text-[11px] font-medium text-ink-muted">Abrir ubicación</span>
            </span>
          </a>

          <a
            href={waze}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setTimeout(onClose, 50)}
            className="flex items-center gap-3 rounded-action border border-ink-soft bg-white px-4 py-3 text-left text-[14px] font-bold text-ink active:scale-[0.98]"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: '#33CCFF' }}
              aria-hidden
            >
              <Navigation size={18} strokeWidth={2} />
            </span>
            <span className="flex flex-col">
              <span>Waze</span>
              <span className="text-[11px] font-medium text-ink-muted">Navegar</span>
            </span>
          </a>

          <button
            type="button"
            onClick={copyAddress}
            className="flex items-center gap-3 rounded-action border border-ink-soft bg-white px-4 py-3 text-left text-[14px] font-bold text-ink active:scale-[0.98]"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-soft text-ink"
              aria-hidden
            >
              <Copy size={16} strokeWidth={2} />
            </span>
            <span className="flex flex-col">
              <span>Copiar dirección</span>
              <span className="text-[11px] font-medium text-ink-muted">Para pegarla en otra app</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
