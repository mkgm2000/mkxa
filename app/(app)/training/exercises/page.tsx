'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search } from 'lucide-react';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';
import { ExerciseSheet } from '@/components/training/ExerciseSheet';
import { loadCatalog, type CatalogExercise } from '@/lib/training/exercise-catalog';
import { thumbUrl } from '@/lib/training/exercise-media';

const BODY_PARTS: { value: string; label: string }[] = [
  { value: 'upper legs', label: 'Pierna' },
  { value: 'lower legs', label: 'Gemelo' },
  { value: 'back', label: 'Espalda' },
  { value: 'chest', label: 'Pecho' },
  { value: 'shoulders', label: 'Hombro' },
  { value: 'upper arms', label: 'Brazo' },
  { value: 'lower arms', label: 'Antebrazo' },
  { value: 'waist', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'neck', label: 'Cuello' },
];

const PAGE = 90;

// Strip accents so "búlgara" matches "bulgara".
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function ExercisesPage() {
  const router = useRouter();
  const [all, setAll] = useState<CatalogExercise[] | null>(null);
  const [query, setQuery] = useState('');
  const [part, setPart] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<CatalogExercise | null>(null);

  useEffect(() => {
    let live = true;
    void loadCatalog().then((data) => { if (live) setAll(data); });
    return () => { live = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!all) return [];
    const q = norm(query.trim());
    return all.filter((e) => {
      if (part && e.body_part !== part) return false;
      if (q && !norm(e.name).includes(q) && !norm(e.equipment).includes(q)) return false;
      return true;
    });
  }, [all, query, part]);

  // Reset paging whenever the filter set changes.
  useEffect(() => { setLimit(PAGE); }, [query, part]);

  const shown = filtered.slice(0, limit);

  return (
    <main className="flex flex-col gap-5 pb-16 pt-2">
      <header className="flex items-start justify-between gap-4 px-5 pt-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Biblioteca
          </p>
          <h1 className="mt-1 font-sans text-[36px] font-extrabold leading-[1.02] tracking-tightest text-ink">
            Ejercicios
          </h1>
        </div>
        <HeaderActionButton
          icon={ChevronLeft}
          label="Volver"
          onClick={() => router.push('/training')}
        />
      </header>

      <div className="px-5">
        <div className="flex items-center gap-2 rounded-item border border-ink-soft bg-white px-3 py-2.5 focus-within:border-ink">
          <Search size={16} strokeWidth={1.75} className="flex-shrink-0 text-ink-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio o material…"
            aria-label="Buscar ejercicio"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-muted focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip label="Todos" active={part == null} onClick={() => setPart(null)} />
        {BODY_PARTS.map((b) => (
          <FilterChip
            key={b.value}
            label={b.label}
            active={part === b.value}
            onClick={() => setPart(part === b.value ? null : b.value)}
          />
        ))}
      </div>

      <p className="px-5 text-[12px] text-ink-muted">
        {all == null ? 'Cargando catálogo…' : `${filtered.length} ejercicios`}
      </p>

      <div className="grid grid-cols-2 gap-3 px-5 sm:grid-cols-3">
        {shown.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setOpen(e)}
            className="flex flex-col overflow-hidden rounded-card border border-ink-soft bg-white text-left shadow-item transition-transform duration-150 active:scale-[0.98]"
          >
            <div className="aspect-square w-full overflow-hidden bg-[#f3ecdd]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl(e.id)}
                alt=""
                loading="lazy"
                onError={(ev) => { ev.currentTarget.style.display = 'none'; }}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-0.5 p-2.5">
              <span className="line-clamp-2 text-[12.5px] font-semibold capitalize leading-tight text-ink">
                {e.name}
              </span>
              <span className="text-[10px] uppercase tracking-[0.04em] text-ink-muted">
                {e.equipment}
              </span>
            </div>
          </button>
        ))}
      </div>

      {limit < filtered.length && (
        <div className="px-5">
          <button
            type="button"
            onClick={() => setLimit((n) => n + PAGE)}
            className="w-full rounded-action border border-ink-soft bg-white px-4 py-3 text-[13px] font-semibold text-ink shadow-action transition-transform duration-150 active:scale-95"
          >
            Cargar más ({filtered.length - limit})
          </button>
        </div>
      )}

      {all != null && filtered.length === 0 && (
        <p className="px-5 text-[13px] text-ink-muted">Sin resultados. Prueba otro término.</p>
      )}

      {open && (
        <ExerciseSheet
          exerciseId={open.id}
          blockName={open.name}
          onClose={() => setOpen(null)}
        />
      )}
    </main>
  );
}

function FilterChip({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors duration-150 ${
        active ? 'bg-ink text-white' : 'border border-ink-soft bg-white text-ink-muted'
      }`}
    >
      {label}
    </button>
  );
}
