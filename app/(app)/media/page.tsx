'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronLeft, Search, X, Plus, Check, Film, Tv, Trash2, Star } from 'lucide-react';
import { useMedia } from '@/lib/hooks/use-media';
import { useAthlete } from '@/lib/athlete-context';
import {
  PROVIDERS,
  providerMeta,
  tmdbImage,
  releaseYear,
  type MediaItem,
  type ProviderKey,
  type Athlete,
} from '@/lib/media/types';

type Tab = 'wishlist' | 'seen';
type WhoFilter = 'all' | Athlete;

interface SearchResult {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number | null;
}

export default function MediaPage() {
  const athlete = useAthlete();
  const { items, loading, refresh, create, update, remove } = useMedia();

  const [tab, setTab] = useState<Tab>('wishlist');
  const [who, setWho] = useState<WhoFilter>('all');
  const [provider, setProvider] = useState<ProviderKey | 'all'>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);

  const filtered = useMemo(() => {
    return items.filter((m) => {
      if (m.status !== tab) return false;
      if (who !== 'all' && m.added_by !== who) return false;
      if (provider !== 'all' && !m.providers.includes(provider)) return false;
      return true;
    });
  }, [items, tab, who, provider]);

  return (
    <main className="flex flex-col gap-4 pt-2">
      <header className="flex items-start justify-between gap-4 px-5 pt-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Cine y series
          </p>
          <h1 className="mt-1 font-sans text-[28px] font-extrabold leading-[1.05] tracking-tightest text-ink">
            Lo que veremos
          </h1>
        </div>
        <Link
          href="/home"
          aria-label="Volver"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
      </header>

      {/* Status tabs: Pendientes vs Vistas */}
      <div className="px-5">
        <div role="tablist" className="relative grid grid-cols-2 rounded-full bg-white p-1.5 shadow-action">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/2)] rounded-full bg-ink transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${tab === 'wishlist' ? 0 : 100}%)` }}
          />
          {([['wishlist', 'Queremos ver'], ['seen', 'Vistas']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`relative z-10 py-2 text-[12px] font-bold ${tab === key ? 'text-white' : 'text-ink-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Who filter — only meaningful in the wishlist tab, but kept on
          both so seen items can also be split by who added them. */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: 'none' }}>
        {(['all', 'MK', 'Xabi'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setWho(k)}
            className={clsx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors',
              who === k ? 'bg-ink text-white shadow-card' : 'bg-white text-ink-muted shadow-action',
            )}
          >
            {k === 'all' ? 'Los dos' : k}
          </button>
        ))}
        <span aria-hidden className="h-6 w-px shrink-0 self-center bg-ink-soft" />
        {(['all', ...PROVIDERS.map((p) => p.key)] as const).map((k) => {
          const meta = k === 'all' ? null : providerMeta(k);
          const active = provider === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setProvider(k)}
              className={clsx(
                'shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors',
                active ? 'text-white shadow-card' : 'bg-white text-ink-muted shadow-action',
              )}
              style={active && meta ? { backgroundColor: meta.color } : active ? { backgroundColor: '#1d1d1f' } : undefined}
            >
              {meta ? meta.label : 'Todas'}
            </button>
          );
        })}
      </div>

      {/* Poster grid */}
      <section className="px-5">
        {loading ? (
          <p className="py-10 text-center text-[12px] text-ink-muted">Cargando…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-card bg-white p-6 text-center shadow-card">
            <Film size={28} strokeWidth={1.5} className="mx-auto text-ink-muted" aria-hidden />
            <p className="mt-2 text-[13px] font-bold text-ink">
              {tab === 'wishlist' ? 'No hay nada en cola.' : 'No habéis marcado nada como visto.'}
            </p>
            <p className="mt-1 text-[12px] text-ink-muted">
              Toca el botón “+” para buscar una peli o serie.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className="group flex w-full flex-col overflow-hidden rounded-card bg-white shadow-card transition-transform duration-150 active:scale-[0.98]"
                >
                  <div className="relative aspect-[2/3] w-full bg-ink-soft">
                    {m.poster_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tmdbImage(m.poster_path, 'w342') ?? ''}
                        alt={m.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-muted">
                        {m.media_type === 'tv' ? <Tv size={28} /> : <Film size={28} />}
                      </div>
                    )}
                    {m.added_by && (
                      <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                        {m.added_by}
                      </span>
                    )}
                    {m.vote_average !== null && (
                      <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                        <Star size={9} strokeWidth={2} fill="currentColor" aria-hidden />
                        {m.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-2.5">
                    <p className="line-clamp-2 text-left text-[12px] font-bold leading-tight text-ink">
                      {m.title}
                    </p>
                    <p className="text-left text-[10px] text-ink-muted">
                      {m.media_type === 'tv' ? 'Serie' : 'Película'}
                      {releaseYear(m.release_date) ? ` · ${releaseYear(m.release_date)}` : ''}
                    </p>
                    {m.providers.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.providers.slice(0, 3).map((p) => {
                          const meta = providerMeta(p);
                          return (
                            <span
                              key={p}
                              className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white"
                              style={{ backgroundColor: meta.color }}
                            >
                              {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Floating add button */}
      <button
        type="button"
        aria-label="Buscar peli o serie"
        onClick={() => setSearchOpen(true)}
        className="fixed bottom-28 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-2xl active:scale-95"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 16px) + 96px)' }}
      >
        <Plus size={24} strokeWidth={2} aria-hidden />
      </button>

      {searchOpen && athlete && (
        <SearchSheet
          athlete={athlete}
          onClose={() => setSearchOpen(false)}
          onAdded={async () => { await refresh(); }}
          create={create}
        />
      )}

      {selected && (
        <DetailSheet
          item={selected}
          onClose={() => setSelected(null)}
          onUpdate={async (patch) => {
            const next = await update(selected.id, patch);
            setSelected(next);
          }}
          onDelete={async () => {
            await remove(selected.id);
            setSelected(null);
          }}
        />
      )}
    </main>
  );
}

// --- Search sheet ---------------------------------------------------------

function SearchSheet({
  athlete,
  onClose,
  onAdded,
  create,
}: {
  athlete: Athlete;
  onClose: () => void;
  onAdded: () => Promise<void>;
  create: ReturnType<typeof useMedia>['create'];
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  // Debounced search — 350ms after the last keystroke. Empty → clear.
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q.trim())}`);
        const data = (await r.json()) as { results?: SearchResult[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [q]);

  async function pick(r: SearchResult) {
    setAddingId(r.tmdb_id);
    // Fetch providers + runtime from TMDB before insert so the card has
    // all the metadata it needs (chips, runtime in detail).
    let providers: string[] = [];
    let runtime_minutes: number | null = null;
    let genres: string[] = [];
    try {
      const d = await fetch(`/api/tmdb/details?id=${r.tmdb_id}&type=${r.media_type}`);
      const data = (await d.json()) as { providers?: string[]; runtime_minutes?: number | null; genres?: string[] };
      providers = data.providers ?? [];
      runtime_minutes = data.runtime_minutes ?? null;
      genres = data.genres ?? [];
    } catch { /* details optional */ }

    await create({
      tmdb_id: r.tmdb_id,
      media_type: r.media_type,
      title: r.title,
      original_title: r.original_title,
      overview: r.overview,
      poster_path: r.poster_path,
      backdrop_path: r.backdrop_path,
      release_date: r.release_date,
      vote_average: r.vote_average,
      runtime_minutes,
      providers: providers as ProviderKey[],
      genres,
      status: 'wishlist',
      added_by: athlete,
    });
    setAddingId(null);
    await onAdded();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar peli o serie"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:h-[80vh] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-ink-soft/40 px-4 py-3">
          <h3 className="font-sans text-[17px] font-extrabold text-ink">Buscar</h3>
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
              placeholder="Título, actor, saga…"
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
          <p className="mt-2 text-[10px] text-ink-muted">
            Se añadirá a tu lista “Queremos ver” como {athlete}.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searching && <p className="px-4 py-6 text-center text-[12px] text-ink-muted">Buscando…</p>}
          {!searching && q && results.length === 0 && (
            <p className="px-4 py-6 text-center text-[12px] text-ink-muted">Sin resultados.</p>
          )}
          {!searching && !q && (
            <p className="px-4 py-6 text-center text-[12px] text-ink-muted">
              Escribe el título de una peli o serie para empezar.
            </p>
          )}
          <ul className="divide-y divide-ink-soft/40">
            {results.map((r) => {
              const adding = addingId === r.tmdb_id;
              return (
                <li key={`${r.media_type}:${r.tmdb_id}`}>
                  <button
                    type="button"
                    onClick={() => void pick(r)}
                    disabled={adding}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-ink-soft/20 disabled:opacity-60"
                  >
                    {r.poster_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tmdbImage(r.poster_path, 'w185') ?? ''}
                        alt=""
                        className="h-20 w-14 shrink-0 rounded-action object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-20 w-14 shrink-0 rounded-action bg-ink-soft" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13px] font-bold text-ink">{r.title}</p>
                      <p className="text-[11px] text-ink-muted">
                        {r.media_type === 'tv' ? 'Serie' : 'Película'}
                        {releaseYear(r.release_date) ? ` · ${releaseYear(r.release_date)}` : ''}
                        {r.vote_average !== null ? ` · ★ ${r.vote_average.toFixed(1)}` : ''}
                      </p>
                      {r.overview && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-ink-muted">{r.overview}</p>
                      )}
                    </div>
                    <span
                      className={clsx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        adding ? 'bg-ink-soft text-ink-muted' : 'bg-ink text-white',
                      )}
                      aria-hidden
                    >
                      <Plus size={16} strokeWidth={2} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// --- Detail sheet ---------------------------------------------------------

function DetailSheet({
  item,
  onClose,
  onUpdate,
  onDelete,
}: {
  item: MediaItem;
  onClose: () => void;
  onUpdate: (patch: Partial<MediaItem>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const backdrop = tmdbImage(item.backdrop_path ?? item.poster_path, 'w780');

  async function toggleStatus() {
    setBusy(true);
    await onUpdate({
      status: item.status === 'wishlist' ? 'seen' : 'wishlist',
      watched_at: item.status === 'wishlist' ? new Date().toISOString().slice(0, 10) : null,
    });
    setBusy(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="relative h-44 w-full bg-ink-soft">
          {backdrop ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={backdrop} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
          >
            <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
          </button>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              {item.media_type === 'tv' ? 'Serie' : 'Película'}
              {releaseYear(item.release_date) ? ` · ${releaseYear(item.release_date)}` : ''}
              {item.runtime_minutes ? ` · ${item.runtime_minutes} min` : ''}
            </p>
            <h2 className="mt-0.5 font-sans text-[22px] font-extrabold leading-tight tracking-tightest">
              {item.title}
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {item.providers.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {item.providers.map((p) => {
                const meta = providerMeta(p);
                return (
                  <span
                    key={p}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.label}
                  </span>
                );
              })}
            </div>
          )}

          {item.overview && (
            <p className="text-[13px] leading-relaxed text-ink">{item.overview}</p>
          )}

          {item.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.genres.map((g) => (
                <span key={g} className="rounded-full bg-ink-soft px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                  {g}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-action bg-ink-soft/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Añadido por</p>
              <p className="mt-0.5 font-bold text-ink">{item.added_by ?? '—'}</p>
            </div>
            <div className="rounded-action bg-ink-soft/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Estado</p>
              <p className="mt-0.5 font-bold text-ink">
                {item.status === 'seen' ? `Vista${item.watched_at ? ` el ${item.watched_at}` : ''}` : 'Por ver'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-ink-soft/40 p-4">
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            disabled={busy}
            className="flex h-12 w-12 items-center justify-center rounded-action border border-ink-soft bg-white text-danger active:scale-95 disabled:opacity-40"
            aria-label="Eliminar"
          >
            <Trash2 size={18} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            onClick={toggleStatus}
            disabled={busy}
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-action py-3 text-[13px] font-bold transition-colors active:scale-[0.99] disabled:opacity-40',
              item.status === 'wishlist' ? 'bg-ink text-white' : 'border border-ink-soft bg-white text-ink',
            )}
          >
            <Check size={16} strokeWidth={2.2} aria-hidden />
            {item.status === 'wishlist' ? 'Marcar como vista' : 'Volver a por ver'}
          </button>
        </div>

        {confirmDel && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setConfirmDel(false)}
          >
            <div
              className="w-full max-w-sm rounded-card bg-white p-5 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-sans text-[16px] font-extrabold text-ink">
                ¿Quitar “{item.title}” de la lista?
              </p>
              <p className="mt-1 text-[12px] text-ink-muted">Es definitivo.</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDel(false)}
                  className="flex-1 rounded-action border border-ink-soft py-3 text-[12px] font-bold text-ink"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => { setConfirmDel(false); await onDelete(); }}
                  className="flex-1 rounded-action bg-danger py-3 text-[12px] font-bold text-white"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
