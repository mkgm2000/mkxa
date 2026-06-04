'use client';

import { useState } from 'react';
import { Plus, Check, X, Minus, Search as SearchIcon } from 'lucide-react';
import { AISLES, aisleLabel, type Aisle } from '@/lib/meals/recipes';
import { inferAisle } from '@/lib/meals/ingredient-aisles';
import { ProductSearchSheet, type ProductPick } from './ProductSearchSheet';

interface PantryAddRowProps {
  onAdd: (input: {
    name: string;
    aisle: Aisle;
    units?: number | null;
    image_url?: string | null;
    off_barcode?: string | null;
    kcal_100g?: number | null;
    protein_100g?: number | null;
    carbs_100g?: number | null;
    fat_100g?: number | null;
    macros_source?: 'mercadona' | 'off' | 'estimate' | 'manual' | null;
  }) => Promise<void> | void;
}

export function PantryAddRow({ onAdd }: PantryAddRowProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState<Aisle>('otros');
  const [units, setUnits] = useState<number | ''>('');
  // Product metadata captured when the user picks from the search sheet.
  // Null for fully-manual entries.
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [offBarcode, setOffBarcode] = useState<string | null>(null);
  const [macros, setMacros] = useState<{
    kcal_100g: number | null;
    protein_100g: number | null;
    carbs_100g: number | null;
    fat_100g: number | null;
    source: 'mercadona' | 'off' | 'estimate' | 'manual' | null;
  }>({ kcal_100g: null, protein_100g: null, carbs_100g: null, fat_100g: null, source: null });
  const [searchOpen, setSearchOpen] = useState(false);

  function applyPick(p: ProductPick) {
    setName(p.name);
    setAisle(p.aisle);
    setImageUrl(p.image_url);
    setOffBarcode(p.off_barcode);
    setMacros({
      kcal_100g: p.kcal_100g,
      protein_100g: p.protein_100g,
      carbs_100g: p.carbs_100g,
      fat_100g: p.fat_100g,
      source: p.macros_source,
    });
    setSearchOpen(false);
    setOpen(true);
  }

  async function submit() {
    const n = name.trim();
    if (!n) return;
    const u = typeof units === 'number' && units > 0 ? Math.trunc(units) : null;
    await onAdd({
      name: n,
      aisle,
      units: u,
      image_url: imageUrl,
      off_barcode: offBarcode,
      kcal_100g: macros.kcal_100g,
      protein_100g: macros.protein_100g,
      carbs_100g: macros.carbs_100g,
      fat_100g: macros.fat_100g,
      macros_source: macros.source,
    });
    setName(''); setAisle('otros'); setUnits('');
    setImageUrl(null); setOffBarcode(null);
    setMacros({ kcal_100g: null, protein_100g: null, carbs_100g: null, fat_100g: null, source: null });
    setOpen(false);
  }

  if (!open) {
    return (
      <>
        <div className="mx-2 flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-item border border-dashed border-ink-soft bg-white/40 px-3 py-3 text-[13px] font-medium text-ink-muted"
          >
            <Plus size={16} strokeWidth={1.5} aria-hidden />
            Añadir manual
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 rounded-item bg-ink px-3 py-3 text-[13px] font-bold text-white shadow-item"
          >
            <SearchIcon size={14} strokeWidth={1.75} aria-hidden />
            Buscar
          </button>
        </div>
        {searchOpen && (
          <ProductSearchSheet onClose={() => setSearchOpen(false)} onPick={applyPick} />
        )}
      </>
    );
  }

  return (
    <div className="mx-2 rounded-item bg-white p-3 shadow-item">
      {imageUrl && (
        <div className="mb-3 flex items-center gap-3 rounded-item bg-white/60 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className={`h-12 w-12 shrink-0 rounded-action bg-white ${macros.source === 'mercadona' ? 'object-cover' : 'object-contain p-0.5'}`}
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <p className="line-clamp-1 text-[11px] font-bold text-ink">
              {macros.source === 'mercadona' ? 'Producto Mercadona' : 'Producto OpenFoodFacts'}
            </p>
            {macros.kcal_100g !== null && (
              <p className="line-clamp-1 text-[10px] text-ink-muted">
                {macros.source === 'estimate' ? '≈ ' : ''}
                {macros.kcal_100g} kcal · P {macros.protein_100g ?? 0} · C {macros.carbs_100g ?? 0} · G {macros.fat_100g ?? 0} / 100g
                {macros.source === 'estimate' && (
                  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-amber-700">Estimado</span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Quitar producto"
            onClick={() => {
              setImageUrl(null);
              setOffBarcode(null);
              setMacros({ kcal_100g: null, protein_100g: null, carbs_100g: null, fat_100g: null, source: null });
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-ink-soft text-ink-muted"
          >
            <X size={12} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      )}
      <input
        autoFocus
        value={name}
        onChange={(e) => {
          const v = e.target.value;
          setName(v);
          if (aisle === 'otros' && v.trim().length >= 3) {
            const guess = inferAisle(v);
            if (guess !== 'otros') setAisle(guess);
          }
        }}
        placeholder="ej: leche, aceite, pollo…"
        aria-label="Item de despensa"
        className="mb-2 w-full border-b border-ink-soft py-1 text-[14px] outline-none focus:border-ink"
      />
      <select
        value={aisle}
        onChange={(e) => setAisle(e.target.value as Aisle)}
        aria-label="Sección"
        className="mb-2 w-full rounded-md border border-ink-soft bg-white px-2 py-2 text-[14px] text-ink"
      >
        {AISLES.map((a) => <option key={a} value={a}>{aisleLabel(a)}</option>)}
      </select>
      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="pantry-units" className="text-[13px] text-ink-muted">Unidades</label>
        <button
          type="button"
          onClick={() => setUnits((u) => {
            const n = typeof u === 'number' ? u : 0;
            return Math.max(0, n - 1) || '';
          })}
          aria-label="Restar unidad"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-soft text-ink-muted"
        >
          <Minus size={14} strokeWidth={1.5} aria-hidden />
        </button>
        <input
          id="pantry-units"
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          step={1}
          value={units}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') { setUnits(''); return; }
            const n = parseInt(raw, 10);
            setUnits(Number.isFinite(n) && n > 0 ? n : '');
          }}
          placeholder="–"
          aria-label="Unidades"
          className="h-8 w-16 rounded-md border border-ink-soft bg-white text-center text-[14px] outline-none focus:border-ink"
        />
        <button
          type="button"
          onClick={() => setUnits((u) => (typeof u === 'number' ? u + 1 : 1))}
          aria-label="Sumar unidad"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-soft text-ink-muted"
        >
          <Plus size={14} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} aria-label="Cancelar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-soft text-ink-muted">
          <X size={16} strokeWidth={1.5} aria-hidden />
        </button>
        <button type="button" onClick={submit} aria-label="Añadir"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
          <Check size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      {searchOpen && (
        <ProductSearchSheet onClose={() => setSearchOpen(false)} onPick={applyPick} />
      )}
    </div>
  );
}
