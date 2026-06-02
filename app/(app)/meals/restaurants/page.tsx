'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Heart, CheckCircle2 } from 'lucide-react';
import { useRestaurants } from '@/lib/hooks/use-restaurants';
import { RestaurantCard } from '@/components/meals/RestaurantCard';
import { RestaurantForm } from '@/components/meals/RestaurantForm';
import type { Restaurant, RestaurantStatus } from '@/lib/meals/restaurants';

export default function RestaurantsPage() {
  const { items, loading, create, update, remove } = useRestaurants();
  const [tab, setTab] = useState<RestaurantStatus>('wishlist');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Restaurant | null>(null);

  const filtered = useMemo(() => items.filter((r) => r.status === tab), [items, tab]);
  const wishCount = items.filter((r) => r.status === 'wishlist').length;
  const visitedCount = items.filter((r) => r.status === 'visited').length;

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(r: Restaurant) { setEditing(r); setFormOpen(true); }

  async function handleSubmit(payload: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>) {
    if (editing) await update(editing.id, payload);
    else await create({ ...payload, name: payload.name });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await remove(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <main className="flex flex-col gap-4 pb-32 pt-2">
      <header className="flex items-start justify-between gap-4 px-5 pt-6">
        <div>
          <h1 className="font-sans text-[36px] font-extrabold leading-[1.05] tracking-tightest text-ink">
            Restaurantes
          </h1>
          <p className="mt-2 text-[13px] text-ink-muted">
            Para descubrir + memoria de los visitados
          </p>
        </div>
        <Link
          href="/meals"
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
      </header>

      <div className="px-5">
        <div role="tablist" aria-label="Estado" className="relative grid grid-cols-2 rounded-full bg-white p-1.5 shadow-action">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/2)] rounded-full bg-ink transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${tab === 'wishlist' ? 0 : 100}%)` }}
          />
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'wishlist'}
            onClick={() => setTab('wishlist')}
            className={`relative z-10 flex items-center justify-center gap-1.5 py-2 text-[13px] font-bold ${tab === 'wishlist' ? 'text-white' : 'text-ink-muted'}`}
          >
            <Heart size={14} strokeWidth={2} aria-hidden fill={tab === 'wishlist' ? 'currentColor' : 'none'} />
            Por probar
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${tab === 'wishlist' ? 'bg-white/20 text-white' : 'bg-ink-soft text-ink'}`}>
              {wishCount}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'visited'}
            onClick={() => setTab('visited')}
            className={`relative z-10 flex items-center justify-center gap-1.5 py-2 text-[13px] font-bold ${tab === 'visited' ? 'text-white' : 'text-ink-muted'}`}
          >
            <CheckCircle2 size={14} strokeWidth={2} aria-hidden />
            Visitados
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${tab === 'visited' ? 'bg-white/20 text-white' : 'bg-ink-soft text-ink'}`}>
              {visitedCount}
            </span>
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-3 px-5">
        {loading ? (
          <p className="py-8 text-center text-[13px] text-ink-muted">Cargando…</p>
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} onAdd={openNew} />
        ) : (
          filtered.map((r) => (
            <RestaurantCard key={r.id} r={r} onEdit={openEdit} onDelete={setPendingDelete} />
          ))
        )}
      </section>

      <button
        type="button"
        onClick={openNew}
        aria-label="Añadir restaurante"
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-2xl active:scale-95"
        style={{ boxShadow: '0 10px 28px rgba(27,29,31,0.4)' }}
      >
        <Plus size={26} strokeWidth={2} aria-hidden />
      </button>

      {formOpen && (
        <RestaurantForm
          initial={editing}
          defaultStatus={tab}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-sans text-[18px] font-extrabold text-ink">¿Eliminar?</h3>
            <p className="mt-2 text-[13px] text-ink-muted">
              Se eliminará <strong className="text-ink">{pendingDelete.name}</strong> de la lista. No se puede deshacer.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-action border border-ink-soft py-3 text-[14px] font-bold text-ink active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-action bg-danger py-3 text-[14px] font-bold text-white active:scale-95"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function EmptyState({ tab, onAdd }: { tab: RestaurantStatus; onAdd: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-card bg-white p-8 text-center shadow-card">
      <div className="text-[48px]" aria-hidden>
        {tab === 'wishlist' ? '🍽️' : '✨'}
      </div>
      <h3 className="font-sans text-[18px] font-extrabold text-ink">
        {tab === 'wishlist' ? 'Sin restaurantes por probar' : 'Aún ningún visitado'}
      </h3>
      <p className="max-w-[260px] text-[13px] text-ink-muted">
        {tab === 'wishlist'
          ? 'Añade los sitios que os apetece descubrir juntos.'
          : 'Cuando vayáis a uno, márcalo como visitado para guardar la valoración.'}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 rounded-action bg-ink px-5 py-2.5 text-[14px] font-bold text-white active:scale-95"
      >
        Añadir el primero
      </button>
    </div>
  );
}
