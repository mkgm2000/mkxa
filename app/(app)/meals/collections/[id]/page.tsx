'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ChevronLeft, Search, X, Check, ChefHat, Trash2, RefreshCw } from 'lucide-react';
import { useCollection, deleteCollection } from '@/lib/hooks/use-collections';
import { saveRecipe } from '@/lib/hooks/use-recipes';
import { CollectionImportProgress } from '@/components/meals/CollectionImportProgress';
import { useAthlete } from '@/lib/athlete-context';
import { MEAL_SLOTS, mealSlotLabel, type MealSlot } from '@/lib/meals/recipes';
import type { RecipeCollectionItem } from '@/lib/meals/collections';

type Filter = 'all' | 'pending' | 'promoted';

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? null;
  const athlete = useAthlete();
  const { collection, promotedItems, loading, refresh } = useCollection(id);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('pending');
  const [promoting, setPromoting] = useState<RecipeCollectionItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function triggerRefresh() {
    if (!collection) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch('/api/extractors/tiktok-collection-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: collection.source_url,
          mode: 'refresh',
          collection_id: collection.id,
          athlete,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setRefreshError(data.error ?? 'No se pudo arrancar la actualización');
        setRefreshing(false);
        return;
      }
      // Re-fetch row to surface the new 'queued' status to the progress bar.
      await refresh();
    } catch {
      setRefreshError('Sin conexión');
    } finally {
      // Keep the progress component alive — it polls until completed.
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    if (!collection) return [];
    const q = query.trim().toLowerCase();
    return collection.items.filter((it) => {
      const isPromoted = promotedItems.has(it.video_url);
      if (filter === 'pending' && isPromoted) return false;
      if (filter === 'promoted' && !isPromoted) return false;
      if (q) {
        const hay = `${it.title} ${it.author ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [collection, query, filter, promotedItems]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-[13px] text-ink-muted">Cargando colección…</p>
      </main>
    );
  }
  if (!collection) {
    return (
      <main className="flex flex-col gap-3 px-5 pt-6">
        <p className="text-[13px] text-ink-muted">Colección no encontrada.</p>
        <Link href="/meals?tab=recetas" className="text-[13px] font-bold text-ink underline">
          Volver a recetas
        </Link>
      </main>
    );
  }

  const pendingCount = collection.items.length - promotedItems.size;

  return (
    <main className="flex flex-col gap-4 pb-12 pt-2">
      <header className="flex items-start justify-between gap-4 px-5 pt-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Colección · {collection.item_count} vídeos
          </p>
          <h1 className="mt-1 truncate font-sans text-[28px] font-extrabold leading-[1.05] tracking-tightest text-ink">
            {collection.title}
          </h1>
          <p className="mt-1 text-[12px] text-ink-muted">
            {promotedItems.size} pasados · {pendingCount} pendientes
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Actualizar colección"
            disabled={refreshing}
            onClick={() => { void triggerRefresh(); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-action active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} strokeWidth={1.75} className={refreshing ? 'animate-spin' : ''} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Eliminar colección"
            onClick={() => setConfirmDelete(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-danger shadow-action active:scale-95"
          >
            <Trash2 size={18} strokeWidth={1.75} aria-hidden />
          </button>
          <Link
            href="/meals?tab=recetas"
            aria-label="Volver"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
          >
            <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
          </Link>
        </div>
      </header>

      {refreshError && (
        <p className="mx-5 flex items-center gap-2 rounded-action bg-danger/10 px-3 py-2 text-[12px] text-danger">
          {refreshError}
        </p>
      )}

      {collection.import_status && collection.import_status !== 'completed' && (
        <div className="mx-5 rounded-card bg-white p-4 shadow-card">
          <CollectionImportProgress collectionId={collection.id} />
        </div>
      )}

      <div className="px-5">
        <div className="relative">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar vídeo por título…"
            className="w-full rounded-full bg-white px-10 py-2.5 text-[14px] text-ink shadow-action placeholder:text-ink-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Limpiar"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink-soft text-ink active:scale-95"
            >
              <X size={14} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="px-5">
        <div role="tablist" aria-label="Filtro" className="relative grid grid-cols-3 rounded-full bg-white p-1.5 shadow-action">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/3)] rounded-full bg-ink transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${(['all', 'pending', 'promoted'] as const).indexOf(filter) * 100}%)` }}
          />
          {([
            ['all', 'Todos'],
            ['pending', 'Pendientes'],
            ['promoted', 'Pasados'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`relative z-10 py-2 text-[12px] font-bold ${filter === key ? 'text-white' : 'text-ink-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-2 px-5">
        {filtered.length === 0 ? (
          <p className="rounded-card bg-white p-5 text-center text-[13px] text-ink-muted shadow-card">
            {filter === 'pending'
              ? '¡Ya pasaste todos los vídeos a recetas!'
              : filter === 'promoted'
                ? 'Aún no has pasado ningún vídeo a receta.'
                : 'Sin resultados.'}
          </p>
        ) : (
          filtered.map((it) => {
            const isPromoted = promotedItems.has(it.video_url);
            return (
              <div
                key={it.video_url}
                className={clsx(
                  'flex items-center gap-3 rounded-card bg-white p-2.5 shadow-card',
                  isPromoted && 'opacity-60',
                )}
              >
                {it.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.thumbnail}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-action object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-action bg-ink-soft" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-bold text-ink">{it.title}</p>
                  {it.author && <p className="mt-0.5 text-[11px] text-ink-muted">@{it.author}</p>}
                </div>
                {isPromoted ? (
                  <span className="flex h-9 items-center gap-1 rounded-full bg-ink-soft px-3 text-[11px] font-bold text-ink">
                    <Check size={12} strokeWidth={2.2} aria-hidden />
                    Pasada
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Guardar como receta: ${it.title}`}
                    onClick={() => setPromoting(it)}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-[12px] font-bold text-white active:scale-95"
                  >
                    <ChefHat size={12} strokeWidth={2} aria-hidden />
                    Pasar
                  </button>
                )}
              </div>
            );
          })
        )}
      </section>

      {promoting && athlete && (
        <PromoteSheet
          item={promoting}
          collectionId={collection.id}
          athlete={athlete}
          onClose={() => setPromoting(null)}
          onDone={() => { setPromoting(null); void refresh(); }}
        />
      )}

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-8"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-md rounded-card bg-white p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Eliminar colección
            </p>
            <p className="mt-2 font-sans text-[18px] font-extrabold leading-tight text-ink">
              ¿Borrar “{collection.title}”?
            </p>
            <p className="mt-1 text-[12px] text-ink-muted">
              Se eliminan los {collection.item_count} vídeos guardados. Las recetas
              ya pasadas se mantienen, sólo pierden la referencia a esta colección.
              Es definitivo.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-action border border-ink-soft py-3 text-[13px] font-bold text-ink disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  const res = await deleteCollection(collection.id);
                  setDeleting(false);
                  if ('ok' in res) {
                    setConfirmDelete(false);
                    router.push('/meals?tab=recetas');
                  }
                }}
                className="flex-1 rounded-action bg-danger py-3 text-[13px] font-bold text-white disabled:opacity-40"
              >
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function PromoteSheet({
  item,
  collectionId,
  athlete,
  onClose,
  onDone,
}: {
  item: RecipeCollectionItem;
  collectionId: string;
  athlete: 'MK' | 'Xabi';
  onClose: () => void;
  onDone: () => void;
}) {
  const [slot, setSlot] = useState<MealSlot>('lunch');
  const [saving, setSaving] = useState(false);

  async function go() {
    setSaving(true);
    const res = await saveRecipe({
      recipe: {
        title: item.title,
        source_url: item.video_url,
        source_type: 'tiktok',
        image_url: null,
        prep_minutes: null,
        servings: null,
        tags: item.author ? [`@${item.author.replace(/^@/, '')}`] : [],
        notes: null,
        created_by: athlete,
        meal_type: slot,
        thumbnail_url: item.thumbnail,
        source_collection_id: collectionId,
        source_collection_item: item.video_url,
      },
      ingredients: [],
      steps: [],
    });
    setSaving(false);
    if ('id' in res) onDone();
    else onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pasar a receta"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-[18px] font-extrabold text-ink">Pasar a receta</h3>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
          >
            <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
          </button>
        </div>

        <p className="mt-2 line-clamp-2 text-[13px] font-bold text-ink">{item.title}</p>

        <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Tipo de comida
        </p>
        <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-full bg-ink-soft/40 p-1">
          {MEAL_SLOTS.map((s) => {
            const active = s === slot;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSlot(s)}
                className={clsx(
                  'rounded-full py-2 text-[12px] transition-colors',
                  active ? 'bg-ink text-white font-bold' : 'text-ink-muted font-medium',
                )}
              >
                {mealSlotLabel(s)}
              </button>
            );
          })}
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
            type="button"
            onClick={go}
            disabled={saving}
            className="flex-1 rounded-action bg-ink py-3 text-[14px] font-bold text-white active:scale-95 disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Pasar a recetas'}
          </button>
        </div>
      </div>
    </div>
  );
}
