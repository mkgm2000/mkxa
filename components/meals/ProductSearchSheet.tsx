'use client';

import { useEffect, useState } from 'react';
import { Search, X, Package, Sparkles, AlertCircle } from 'lucide-react';
import { aisleFromOffCategories, normaliseOffProductName } from '@/lib/meals/off';
import { aisleFromMercadonaCategory, capitaliseProductName } from '@/lib/meals/mercadona';
import type { Aisle } from '@/lib/meals/recipes';

export interface ProductPick {
  name: string;
  aisle: Aisle;
  image_url: string | null;
  off_barcode: string | null;
  kcal_100g: number | null;
  protein_100g: number | null;
  carbs_100g: number | null;
  fat_100g: number | null;
  /** 'mercadona' | 'off' | 'estimate' | 'manual' — drives the UI badge. */
  macros_source: 'mercadona' | 'off' | 'estimate' | 'manual' | null;
}

type Source = 'mercadona' | 'off';

interface UnifiedResult {
  source: Source;
  id: string;
  name: string;
  brand: string | null;
  meta: string | null;       // packaging / quantity / price line
  image_url: string | null;
  // Mercadona-only metadata used in the pick step.
  category_top?: string | null;
  category_leaf?: string | null;
  // OFF-only metadata used in the pick step.
  off_barcode?: string;
  off_categories?: string[];
}

interface Props {
  onClose: () => void;
  onPick: (p: ProductPick) => void;
}

// Mercadona-first product search. Hits the Algolia index for the Madrid
// warehouse; if it returns zero results we fall back to OpenFoodFacts.
// On pick, we look up macros via /api/macros/lookup (OFF EAN → estimate)
// and mark the source so the form can show an "Estimado" badge for
// non-real data.
export function ProductSearchSheet({ onClose, onPick }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [source, setSource] = useState<Source>('mercadona');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);

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
        // 1) Mercadona Algolia
        const mRes = await fetch(`/api/mercadona/search?q=${encodeURIComponent(q.trim())}`);
        if (mRes.ok) {
          const d = (await mRes.json()) as { results?: MercadonaSearchHit[] };
          const items = d.results ?? [];
          if (items.length > 0) {
            setSource('mercadona');
            setResults(items.map((it) => ({
              source: 'mercadona' as const,
              id: it.id,
              name: it.name,
              brand: it.brand,
              meta: [it.brand, it.packaging, it.unit_price ? `${it.unit_price} €/${it.reference_format ?? 'ud'}` : null]
                .filter(Boolean)
                .join(' · ') || null,
              image_url: it.image_url,
              category_top: it.category_top,
              category_leaf: it.category_leaf,
            })));
            setSearching(false);
            return;
          }
        }
        // 2) Fallback to OFF
        const oRes = await fetch(`/api/off/search?q=${encodeURIComponent(q.trim())}`);
        if (oRes.ok) {
          const d = (await oRes.json()) as { results?: OffSearchHit[] };
          const items = d.results ?? [];
          setSource('off');
          setResults(items.map((it) => ({
            source: 'off' as const,
            id: it.barcode,
            name: it.name,
            brand: it.brand,
            meta: [it.brand, it.quantity].filter(Boolean).join(' · ') || null,
            image_url: it.image_url,
            off_barcode: it.barcode,
            off_categories: it.categories_tags,
          })));
        } else {
          setError('Búsqueda no disponible');
          setResults([]);
        }
      } catch {
        setError('Sin conexión');
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [q]);

  async function pick(r: UnifiedResult) {
    setPicking(r.id);
    try {
      let ean: string | null = null;
      let categoryTop: string | null = r.category_top ?? null;
      let categoryLeaf: string | null = r.category_leaf ?? null;
      let name = r.name;
      let imageUrl = r.image_url;

      if (r.source === 'mercadona') {
        // Fetch detail to obtain EAN for macros lookup.
        try {
          const dRes = await fetch(`/api/mercadona/product/${r.id}`);
          if (dRes.ok) {
            const d = (await dRes.json()) as {
              ean: string | null;
              name?: string;
              image_url?: string | null;
              category_top: string | null;
              category_leaf: string | null;
            };
            ean = d.ean;
            categoryTop = d.category_top;
            categoryLeaf = d.category_leaf;
            if (d.name) name = d.name;
            if (d.image_url) imageUrl = d.image_url;
          }
        } catch { /* keep what we had */ }
      } else {
        ean = r.off_barcode ?? null;
      }

      // Macros lookup — OFF by EAN, else category estimate.
      const params = new URLSearchParams();
      if (ean) params.set('ean', ean);
      if (name) params.set('name', name);
      if (categoryTop) params.set('category_top', categoryTop);
      if (categoryLeaf) params.set('category_leaf', categoryLeaf);
      const macrosRes = await fetch(`/api/macros/lookup?${params.toString()}`);
      const macros = macrosRes.ok
        ? (await macrosRes.json()) as { source: 'off' | 'estimate'; kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number }
        : null;

      // Aisle: from Mercadona category top (preferred) or OFF categories_tags.
      const aisle: Aisle = r.source === 'mercadona'
        ? aisleFromMercadonaCategory(categoryTop)
        : aisleFromOffCategories(r.off_categories);

      onPick({
        name: capitaliseProductName(
          r.source === 'mercadona' ? name : normaliseOffProductName(name),
        ),
        aisle,
        image_url: imageUrl,
        off_barcode: ean,
        kcal_100g: macros?.kcal_100g ?? null,
        protein_100g: macros?.protein_100g ?? null,
        carbs_100g: macros?.carbs_100g ?? null,
        fat_100g: macros?.fat_100g ?? null,
        macros_source: macros?.source ?? null,
      });
    } finally {
      setPicking(null);
    }
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
              {source === 'mercadona'
                ? 'Mercadona · catálogo Madrid + macros'
                : 'OpenFoodFacts · fallback con macros'}
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
          {searching && <p className="px-4 py-6 text-center text-[12px] text-ink-muted">Buscando en Mercadona…</p>}
          {!searching && q && results.length === 0 && !error && (
            <p className="px-4 py-6 text-center text-[12px] text-ink-muted">Sin resultados.</p>
          )}
          {!searching && !q && (
            <p className="px-4 py-6 text-center text-[12px] text-ink-muted">
              Escribe el nombre del producto. Primero busca en Mercadona; si no, en OpenFoodFacts.
            </p>
          )}
          <ul className="divide-y divide-ink-soft/40">
            {results.map((r) => {
              const isMercadona = r.source === 'mercadona';
              const isPicking = picking === r.id;
              return (
                <li key={`${r.source}:${r.id}`}>
                  <button
                    type="button"
                    disabled={isPicking}
                    onClick={() => { void pick(r); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-ink-soft/20 disabled:opacity-60"
                  >
                    {r.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.image_url}
                        alt=""
                        className={`h-14 w-14 shrink-0 rounded-action bg-white ${isMercadona ? 'object-cover' : 'object-contain p-1'}`}
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
                      {r.meta && <p className="line-clamp-1 text-[11px] text-ink-muted">{r.meta}</p>}
                    </div>
                    {isMercadona && (
                      <span className="shrink-0 rounded-full bg-[#e1f3d1] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#3f6b1c]">
                        Mercadona
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-ink-soft/40 bg-ink-soft/20 px-4 py-2 text-[10px] leading-tight text-ink-muted">
          <p className="flex items-start gap-1.5">
            <Sparkles size={11} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
            Macros reales por código de barras vía OpenFoodFacts.
          </p>
          <p className="mt-1 flex items-start gap-1.5">
            <AlertCircle size={11} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
            Si el producto no tiene datos, mostramos un valor estimado por categoría.
          </p>
        </div>
      </div>
    </div>
  );
}

interface MercadonaSearchHit {
  id: string;
  name: string;
  brand: string | null;
  packaging: string | null;
  image_url: string | null;
  unit_price: string | null;
  reference_format: string | null;
  category_top: string | null;
  category_leaf: string | null;
}

interface OffSearchHit {
  barcode: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  image_url: string | null;
  categories_tags: string[];
}
