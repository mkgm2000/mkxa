'use client';

import { useEffect, useState } from 'react';
import { Search, X, Package } from 'lucide-react';
import { aisleFromOffCategories, normaliseOffProductName } from '@/lib/meals/off';
import type { Aisle } from '@/lib/meals/recipes';

export interface ProductPick {
  name: string;
  aisle: Aisle;
  image_url: string | null;
  off_barcode: string;
}

interface OffResult {
  barcode: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  image_url: string | null;
  categories_tags: string[];
}

interface Props {
  onClose: () => void;
  onPick: (p: ProductPick) => void;
}

// Bottom sheet wrapping /api/off/search. Maps OFF categories → our
// supermarket aisles and normalises the product name (drops "- Mercadona"
// suffixes, lowercases for pantry-dedupe consistency).
export function ProductSearchSheet({ onClose, onPick }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<OffResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!q.trim()) { setResults([]); setError(null); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const r = await fetch(`/api/off/search?q=${encodeURIComponent(q.trim())}`);
        if (!r.ok) { setError('Búsqueda no disponible'); setResults([]); return; }
        const data = (await r.json()) as { results?: OffResult[] };
        setResults(data.results ?? []);
      } catch {
        setError('Sin conexión');
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [q]);

  function pick(r: OffResult) {
    onPick({
      name: normaliseOffProductName(r.name),
      aisle: aisleFromOffCategories(r.categories_tags),
      image_url: r.image_url,
      off_barcode: r.barcode,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar producto"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:h-[80vh] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-ink-soft/40 px-4 py-3">
          <div>
            <h3 className="font-sans text-[17px] font-extrabold text-ink">Buscar producto</h3>
            <p className="mt-0.5 text-[10px] text-ink-muted">
              OpenFoodFacts · Hacendado, marcas blancas, genéricos
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
          >
            <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
          </button>
        </div>

        <div className="border-b border-ink-soft/40 px-4 py-3">
          <div className="relative">
            <Search
              size={16}
              strokeWidth={1.75}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <input
              autoFocus
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="lechuga, yogur griego, atún claro…"
              className="w-full rounded-full bg-white px-10 py-2.5 text-[14px] text-ink shadow-action placeholder:text-ink-muted focus:outline-none"
            />
            {q && (
              <button
                type="button"
                aria-label="Limpiar"
                onClick={() => setQ('')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink-soft text-ink active:scale-95"
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <p className="px-4 py-6 text-center text-[12px] text-danger">{error}</p>}
          {searching && <p className="px-4 py-6 text-center text-[12px] text-ink-muted">Buscando…</p>}
          {!searching && q && results.length === 0 && !error && (
            <p className="px-4 py-6 text-center text-[12px] text-ink-muted">Sin resultados.</p>
          )}
          {!searching && !q && (
            <p className="px-4 py-6 text-center text-[12px] text-ink-muted">
              Escribe el nombre del producto.
            </p>
          )}
          <ul className="divide-y divide-ink-soft/40">
            {results.map((r) => (
              <li key={r.barcode}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-ink-soft/20"
                >
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-action bg-white object-contain p-1"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-action bg-ink-soft text-ink-muted">
                      <Package size={20} strokeWidth={1.5} aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[13px] font-bold text-ink">{r.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {[r.brand, r.quantity].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
