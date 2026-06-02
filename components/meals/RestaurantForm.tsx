'use client';

import { useEffect, useState } from 'react';
import { X, Star } from 'lucide-react';
import {
  CUISINES,
  PRICE_TIERS,
  type CuisineValue,
  type PriceTier,
  type Restaurant,
  type RestaurantStatus,
} from '@/lib/meals/restaurants';
import { useAthlete } from '@/lib/athlete-context';

interface Props {
  initial?: Restaurant | null;
  defaultStatus: RestaurantStatus;
  onClose: () => void;
  onSubmit: (payload: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

export function RestaurantForm({ initial, defaultStatus, onClose, onSubmit }: Props) {
  const athlete = useAthlete();

  const [name, setName] = useState(initial?.name ?? '');
  const [cuisine, setCuisine] = useState<CuisineValue | ''>((initial?.cuisine as CuisineValue) ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [status, setStatus] = useState<RestaurantStatus>(initial?.status ?? defaultStatus);
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [priceTier, setPriceTier] = useState<PriceTier | ''>((initial?.price_tier as PriceTier) ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [visitedAt, setVisitedAt] = useState(initial?.visited_at ?? '');
  const [saving, setSaving] = useState(false);

  // When the user toggles to "visited" for a brand-new entry, prefill today
  // as the visit date — saves them a tap, still editable.
  useEffect(() => {
    if (status === 'visited' && !visitedAt) {
      setVisitedAt(new Date().toISOString().slice(0, 10));
    }
  }, [status, visitedAt]);

  // Body scroll lock while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape.
  useEffect(() => {
    function k(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        cuisine: cuisine || null,
        location: location.trim() || null,
        status,
        added_by: initial?.added_by ?? athlete,
        rating: status === 'visited' ? rating : null,
        price_tier: priceTier || null,
        notes: notes.trim() || null,
        visited_at: status === 'visited' ? (visitedAt || null) : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initial ? 'Editar restaurante' : 'Nuevo restaurante'}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-bg-soft p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-[20px] font-extrabold text-ink">
            {initial ? 'Editar' : 'Nuevo restaurante'}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
          >
            <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {/* Status toggle */}
          <div role="tablist" aria-label="Estado" className="relative grid grid-cols-2 rounded-full bg-white p-1.5 shadow-action">
            <span
              aria-hidden
              className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/2)] rounded-full bg-ink transition-transform duration-200 ease-out"
              style={{ transform: `translateX(${status === 'wishlist' ? 0 : 100}%)` }}
            />
            {(['wishlist', 'visited'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={status === s}
                onClick={() => setStatus(s)}
                className={`relative z-10 py-2 text-[13px] font-bold ${status === s ? 'text-white' : 'text-ink-muted'}`}
              >
                {s === 'wishlist' ? 'Por probar' : 'Visitado'}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1 text-[13px] text-ink">
            Nombre
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Saiti, Pho 8, Trattoria…"
              className="rounded-action border border-ink-soft bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink"
            />
          </label>

          <div>
            <p className="mb-1.5 text-[13px] text-ink">Cocina</p>
            <div className="flex flex-wrap gap-1.5">
              {CUISINES.map((c) => {
                const active = cuisine === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCuisine(active ? '' : c.value)}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-transform active:scale-95 ${
                      active ? 'text-white border-transparent' : 'border-ink-soft bg-white text-ink'
                    }`}
                    style={active ? { backgroundColor: c.color } : undefined}
                  >
                    <span aria-hidden>{c.emoji}</span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-[13px] text-ink">
            Ubicación
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Valencia centro, Ruzafa…"
              className="rounded-action border border-ink-soft bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink"
            />
          </label>

          <div>
            <p className="mb-1.5 text-[13px] text-ink">Precio</p>
            <div className="flex gap-1.5">
              {PRICE_TIERS.map((p) => {
                const active = priceTier === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriceTier(active ? '' : p)}
                    className={`flex-1 rounded-action border py-2 text-[14px] font-bold transition-transform active:scale-95 ${
                      active ? 'border-transparent bg-ink text-white' : 'border-ink-soft bg-white text-ink'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {status === 'visited' && (
            <>
              <div>
                <p className="mb-1.5 text-[13px] text-ink">Valoración</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(rating === n ? null : n)}
                      className="active:scale-90"
                      aria-label={`${n} estrellas`}
                    >
                      <Star
                        size={28}
                        strokeWidth={1.5}
                        className={n <= (rating ?? 0) ? 'text-warning' : 'text-ink-soft'}
                        fill={n <= (rating ?? 0) ? 'currentColor' : 'none'}
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-1 text-[13px] text-ink">
                Fecha de la visita
                <input
                  type="date"
                  value={visitedAt}
                  onChange={(e) => setVisitedAt(e.target.value)}
                  className="rounded-action border border-ink-soft bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-1 text-[13px] text-ink">
            Notas
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={status === 'wishlist'
                ? 'Por qué nos llama, qué probar primero…'
                : 'Qué pedimos, qué nos gustó, repetimos?…'}
              className="resize-none rounded-action border border-ink-soft bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink"
            />
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-action border border-ink-soft bg-white py-3 text-[14px] font-bold text-ink active:scale-95 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 rounded-action bg-ink py-3 text-[14px] font-bold text-white active:scale-95 disabled:opacity-40"
          >
            {saving ? 'Guardando…' : initial ? 'Guardar' : 'Añadir'}
          </button>
        </div>
      </form>
    </div>
  );
}
