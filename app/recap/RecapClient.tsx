'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Share2, Play } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { useAthlete, type Athlete } from '@/lib/athlete-context';
import { MoodFace } from '@/components/mood/MoodFace';
import { getMoodTokens, isMood, type Mood } from '@/lib/moods';
import { tmdbImage } from '@/lib/media/types';
import type { Restaurant } from '@/lib/meals/restaurants';

// ---------------------------------------------------------------------------
// Recap data shape — built once per year+athlete pair, then sliced into
// the slide deck. If a slide's data is empty we render a graceful empty
// state inside it rather than skipping the slot (keeps the deck shape
// stable so the top progress bars don't jitter).
// ---------------------------------------------------------------------------
interface RecapData {
  year: number;
  athlete: Athlete;
  mood: {
    days: number;
    dominant: Mood | null;
    counts: Record<string, number>;
  };
  recipes: {
    total: number;
    topCreator: 'MK' | 'Xabi' | null;
    counts: { MK: number; Xabi: number };
    topMealType: string | null;
  };
  restaurants: {
    visited: number;
    topCuisine: string | null;
    topSpender: 'MK' | 'Xabi' | null;
    winner: Restaurant | null;
  };
  media: {
    seen: number;
    topGenre: string | null;
    topMovie: { title: string; poster_path: string | null; vote_average: number | null } | null;
  };
  training: {
    sessions: number;
    longestStreak: number;
    favouriteTitle: string | null;
  };
  expenses: {
    total: number;
    topCategory: string | null;
    biggest: { amount: number; description: string | null } | null;
  };
  shared: {
    sameDayCount: number;
    happyOverlap: number;
    sadOverlap: number;
  };
}

// Default mood per slide — drives the gradient palette.
const SLIDE_MOODS: Mood[] = [
  'love',     // 0 intro
  'love',     // 1 mood (overridden by dominant)
  'joyful',   // 2 recipes
  'happy',    // 3 restaurants
  'annoyed',  // 4 cine
  'angry',    // 5 training
  'worried',  // 6 expenses
  'love',     // 7 shared mood
  'neutral',  // 8 outro
];

const SAD_MOODS = new Set<Mood>(['sad', 'angry', 'stressed', 'worried', 'annoyed', 'dizzy']);
const HAPPY_MOODS = new Set<Mood>(['happy', 'joyful', 'love']);

const CATEGORY_LABELS: Record<string, string> = {
  comida: 'Comida',
  casa: 'Casa',
  transporte: 'Transporte',
  ocio: 'Ocio',
  salud: 'Salud',
  suscripciones: 'Suscripciones',
  otros: 'Otros',
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Snack',
  dessert: 'Postre',
};

const SLIDE_DURATION_MS = 6000;
const SLIDE_COUNT = 9;

export function RecapClient() {
  const router = useRouter();
  const params = useSearchParams();
  const athlete = useAthlete();
  const yearParam = params?.get('year');
  const year = useMemo(() => {
    const n = yearParam ? Number(yearParam) : NaN;
    return Number.isFinite(n) && n > 2000 ? n : new Date().getFullYear();
  }, [yearParam]);

  const [data, setData] = useState<RecapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [slide, setSlide] = useState(0);

  // Fetch all data in parallel for the year window.
  useEffect(() => {
    if (!athlete) return;
    let cancelled = false;
    (async () => {
      try {
        const built = await loadRecap(athlete, year);
        if (!cancelled) setData(built);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [athlete, year]);

  // Auto-advance timer. Paused until "started" (intro Empezar tap) so the
  // user can read the cover.
  useEffect(() => {
    if (!started) return;
    if (slide >= SLIDE_COUNT - 1) return;
    const id = window.setTimeout(() => setSlide((s) => Math.min(s + 1, SLIDE_COUNT - 1)), SLIDE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [slide, started]);

  // Keyboard navigation (desktop QA).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setSlide((s) => Math.min(s + 1, SLIDE_COUNT - 1));
      else if (e.key === 'ArrowLeft') setSlide((s) => Math.max(s - 1, 0));
      else if (e.key === 'Escape') router.push('/profile');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  if (!athlete) {
    return (
      <main className="flex h-dvh items-center justify-center bg-black text-white">
        <div className="px-6 text-center">
          <p className="text-sm opacity-70">Necesitas elegir atleta primero</p>
          <Link href="/pick" className="mt-3 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold text-black">
            Elegir
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex h-dvh items-center justify-center bg-black text-white">
        <div className="px-6 text-center">
          <p className="text-sm">Algo se rompió al cargar el resumen</p>
          <p className="mt-2 text-xs opacity-60">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex h-dvh items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
          <span className="text-sm opacity-70">Preparando tu {year}…</span>
        </div>
      </main>
    );
  }

  return (
    <RecapDeck
      data={data}
      slide={slide}
      started={started}
      onStart={() => setStarted(true)}
      onPrev={() => setSlide((s) => Math.max(s - 1, 0))}
      onNext={() => setSlide((s) => Math.min(s + 1, SLIDE_COUNT - 1))}
      onClose={() => router.push('/profile')}
    />
  );
}

// ---------------------------------------------------------------------------
// Deck shell — progress bars + tap zones + the active slide.
// ---------------------------------------------------------------------------
interface DeckProps {
  data: RecapData;
  slide: number;
  started: boolean;
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

function RecapDeck({ data, slide, started, onStart, onPrev, onNext, onClose }: DeckProps) {
  const mood = slide === 1 && data.mood.dominant ? data.mood.dominant : SLIDE_MOODS[slide];
  const t = getMoodTokens(mood);

  return (
    <main
      className="relative h-dvh w-full overflow-hidden font-sans text-ink"
      style={{
        background: `linear-gradient(160deg, ${t.cardFrom} 0%, ${t.cardTo} 55%, ${t.bodyMid} 100%)`,
      }}
    >
      {/* Progress bars */}
      <div className="absolute inset-x-0 top-0 z-30 flex gap-1 px-3 pt-3" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
          <ProgressBar key={i} active={i === slide} done={i < slide} running={started && i === slide} />
        ))}
      </div>

      {/* Close button */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/15 text-ink backdrop-blur-sm active:scale-95"
        style={{ top: 'calc(max(env(safe-area-inset-top), 12px) + 18px)' }}
      >
        <ArrowLeft size={18} strokeWidth={2.2} />
      </button>

      {/* Tap zones (skip on intro until started) */}
      {started && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={onPrev}
            className="absolute inset-y-0 left-0 z-20 w-1/3"
          />
          <button
            type="button"
            aria-label="Siguiente"
            onClick={onNext}
            className="absolute inset-y-0 right-0 z-20 w-2/3"
          />
        </>
      )}

      {/* Slide content */}
      <div className="relative z-10 flex h-full flex-col px-6" style={{ paddingTop: 'calc(max(env(safe-area-inset-top), 12px) + 64px)', paddingBottom: 'calc(max(env(safe-area-inset-bottom), 12px) + 24px)' }}>
        <SlideContent data={data} index={slide} onStart={onStart} started={started} />
      </div>
    </main>
  );
}

function ProgressBar({ active, done, running }: { active: boolean; done: boolean; running: boolean }) {
  return (
    <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-black/15">
      <div
        className="absolute inset-y-0 left-0 bg-ink"
        style={{
          width: done ? '100%' : active ? (running ? '100%' : '0%') : '0%',
          transition: active && running ? `width ${SLIDE_DURATION_MS}ms linear` : done ? 'none' : 'none',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slides
// ---------------------------------------------------------------------------
function SlideContent({ data, index, onStart, started }: { data: RecapData; index: number; onStart: () => void; started: boolean }) {
  switch (index) {
    case 0: return <IntroSlide data={data} onStart={onStart} started={started} />;
    case 1: return <MoodSlide data={data} />;
    case 2: return <RecipesSlide data={data} />;
    case 3: return <RestaurantsSlide data={data} />;
    case 4: return <MediaSlide data={data} />;
    case 5: return <TrainingSlide data={data} />;
    case 6: return <ExpensesSlide data={data} />;
    case 7: return <SharedSlide data={data} />;
    case 8: return <OutroSlide data={data} />;
    default: return null;
  }
}

function IntroSlide({ data, onStart, started }: { data: RecapData; onStart: () => void; started: boolean }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/70">mkxa recap</p>
      </div>
      <div>
        <p className="text-[18px] font-bold text-ink/70">Vuestro</p>
        <p className="font-sans text-[120px] font-extrabold leading-[0.9] tracking-tightest text-ink">
          {data.year}
        </p>
        <p className="mt-4 text-[20px] font-bold text-ink">
          en mkxa, {data.athlete}
        </p>
      </div>
      <div className="pb-2">
        {!started ? (
          <button
            type="button"
            onClick={onStart}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-[16px] font-extrabold text-white shadow-card active:scale-[0.98]"
          >
            <Play size={18} fill="white" strokeWidth={0} />
            Empezar
          </button>
        ) : (
          <p className="text-center text-[12px] font-medium text-ink/60">Toca a la derecha para avanzar</p>
        )}
      </div>
    </div>
  );
}

function MoodSlide({ data }: { data: RecapData }) {
  if (data.mood.days === 0) return <EmptySlide title="Mood del año" />;
  const dominant = data.mood.dominant!;
  return (
    <div className="flex h-full flex-col justify-between">
      <Caption>Tu ánimo del año</Caption>
      <div className="flex flex-col items-center">
        <MoodFace mood={dominant} size={220} shadow={false} />
        <p className="mt-6 text-center font-sans text-[60px] font-extrabold leading-[0.95] tracking-tightest text-ink">
          {getMoodTokens(dominant).label}
        </p>
        <p className="mt-3 text-[15px] font-bold text-ink/70">
          fue tu mood más frecuente
        </p>
      </div>
      <div className="pb-2">
        <BigStat number={data.mood.days} label="días registrados" />
      </div>
    </div>
  );
}

function RecipesSlide({ data }: { data: RecapData }) {
  if (data.recipes.total === 0) return <EmptySlide title="Recetas" />;
  const winner = data.recipes.topCreator;
  return (
    <div className="flex h-full flex-col justify-between">
      <Caption>Recetas guardadas</Caption>
      <div>
        <p className="font-sans text-[160px] font-extrabold leading-[0.85] tracking-tightest text-ink">
          {data.recipes.total}
        </p>
        <p className="mt-2 text-[18px] font-bold text-ink">
          recetas en {data.year}
        </p>
      </div>
      <div className="space-y-3 pb-2">
        {winner && (
          <Pill>
            Top chef: <span className="font-extrabold">{winner}</span>
            <span className="ml-2 opacity-60">
              ({data.recipes.counts[winner]} {data.recipes.counts[winner] === 1 ? 'receta' : 'recetas'})
            </span>
          </Pill>
        )}
        {data.recipes.topMealType && (
          <Pill>
            Comida favorita:{' '}
            <span className="font-extrabold">
              {MEAL_TYPE_LABELS[data.recipes.topMealType] ?? data.recipes.topMealType}
            </span>
          </Pill>
        )}
      </div>
    </div>
  );
}

function RestaurantsSlide({ data }: { data: RecapData }) {
  if (data.restaurants.visited === 0) return <EmptySlide title="Restaurantes" />;
  const w = data.restaurants.winner;
  return (
    <div className="flex h-full flex-col justify-between">
      <Caption>Restaurantes visitados</Caption>
      <div>
        <p className="font-sans text-[160px] font-extrabold leading-[0.85] tracking-tightest text-ink">
          {data.restaurants.visited}
        </p>
        <p className="mt-2 text-[18px] font-bold text-ink">
          sitios nuevos probados
        </p>
      </div>
      <div className="space-y-3 pb-2">
        {w && (
          <div className="overflow-hidden rounded-card bg-white/70 p-3 shadow-card backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {w.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.image_url} alt={w.name} className="h-16 w-16 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink/10 text-2xl">🍽️</div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/60">Ganador</p>
                <p className="truncate text-[18px] font-extrabold leading-tight text-ink">{w.name}</p>
                <p className="text-[12px] text-ink/70">
                  {w.rating ? `${'★'.repeat(w.rating)}` : ''} {w.cuisine ?? ''}
                </p>
              </div>
            </div>
          </div>
        )}
        {data.restaurants.topCuisine && (
          <Pill>
            Cocina favorita: <span className="font-extrabold">{capitalize(data.restaurants.topCuisine)}</span>
          </Pill>
        )}
        {data.restaurants.topSpender && (
          <Pill>
            Quien más descubría: <span className="font-extrabold">{data.restaurants.topSpender}</span>
          </Pill>
        )}
      </div>
    </div>
  );
}

function MediaSlide({ data }: { data: RecapData }) {
  if (data.media.seen === 0) return <EmptySlide title="Cine y series" />;
  const top = data.media.topMovie;
  return (
    <div className="flex h-full flex-col justify-between">
      <Caption>Cine y series</Caption>
      <div>
        <p className="font-sans text-[160px] font-extrabold leading-[0.85] tracking-tightest text-ink">
          {data.media.seen}
        </p>
        <p className="mt-2 text-[18px] font-bold text-ink">
          títulos vistos
        </p>
      </div>
      <div className="space-y-3 pb-2">
        {top && (
          <div className="overflow-hidden rounded-card bg-white/70 p-3 shadow-card backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {top.poster_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tmdbImage(top.poster_path, 'w185') ?? ''}
                  alt={top.title}
                  className="h-20 w-14 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-14 items-center justify-center rounded-xl bg-ink/10 text-2xl">🎬</div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/60">Mejor valorada</p>
                <p className="truncate text-[18px] font-extrabold leading-tight text-ink">{top.title}</p>
                {top.vote_average != null && (
                  <p className="text-[12px] text-ink/70">★ {top.vote_average.toFixed(1)} / 10</p>
                )}
              </div>
            </div>
          </div>
        )}
        {data.media.topGenre && (
          <Pill>
            Género favorito: <span className="font-extrabold">{data.media.topGenre}</span>
          </Pill>
        )}
      </div>
    </div>
  );
}

function TrainingSlide({ data }: { data: RecapData }) {
  if (data.training.sessions === 0) return <EmptySlide title="Training" />;
  return (
    <div className="flex h-full flex-col justify-between">
      <Caption>Tu año en HYROX</Caption>
      <div>
        <p className="font-sans text-[160px] font-extrabold leading-[0.85] tracking-tightest text-ink">
          {data.training.sessions}
        </p>
        <p className="mt-2 text-[18px] font-bold text-ink">
          sesiones completadas
        </p>
      </div>
      <div className="space-y-3 pb-2">
        <Pill>
          Racha más larga:{' '}
          <span className="font-extrabold">
            {data.training.longestStreak} {data.training.longestStreak === 1 ? 'semana' : 'semanas'}
          </span>
        </Pill>
        {data.training.favouriteTitle && (
          <Pill>
            Sesión favorita: <span className="font-extrabold">{data.training.favouriteTitle}</span>
          </Pill>
        )}
      </div>
    </div>
  );
}

function ExpensesSlide({ data }: { data: RecapData }) {
  if (data.expenses.total === 0) return <EmptySlide title="Gastos" />;
  return (
    <div className="flex h-full flex-col justify-between">
      <Caption>Lo que se ha movido</Caption>
      <div>
        <p className="font-sans text-[110px] font-extrabold leading-[0.85] tracking-tightest text-ink">
          {formatEuro(data.expenses.total)}
        </p>
        <p className="mt-2 text-[18px] font-bold text-ink">
          gastados en {data.year}
        </p>
      </div>
      <div className="space-y-3 pb-2">
        {data.expenses.topCategory && (
          <Pill>
            Categoría top:{' '}
            <span className="font-extrabold">
              {CATEGORY_LABELS[data.expenses.topCategory] ?? data.expenses.topCategory}
            </span>
          </Pill>
        )}
        {data.expenses.biggest && (
          <Pill>
            Mayor gasto:{' '}
            <span className="font-extrabold">{formatEuro(data.expenses.biggest.amount)}</span>
            {data.expenses.biggest.description && (
              <span className="ml-1 opacity-70">· {data.expenses.biggest.description}</span>
            )}
          </Pill>
        )}
      </div>
    </div>
  );
}

function SharedSlide({ data }: { data: RecapData }) {
  if (data.shared.sameDayCount === 0) return <EmptySlide title="Mood compartido" />;
  return (
    <div className="flex h-full flex-col justify-between">
      <Caption>Mood compartido</Caption>
      <div>
        <p className="font-sans text-[160px] font-extrabold leading-[0.85] tracking-tightest text-ink">
          {data.shared.sameDayCount}
        </p>
        <p className="mt-2 text-[18px] font-bold text-ink">
          días en sintonía
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 pb-2">
        <div className="rounded-card bg-white/70 p-4 shadow-card backdrop-blur-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink/60">Felices a la vez</p>
          <p className="mt-1 font-sans text-[40px] font-extrabold leading-none text-ink">{data.shared.happyOverlap}</p>
        </div>
        <div className="rounded-card bg-white/70 p-4 shadow-card backdrop-blur-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink/60">Bajón juntos</p>
          <p className="mt-1 font-sans text-[40px] font-extrabold leading-none text-ink">{data.shared.sadOverlap}</p>
        </div>
      </div>
    </div>
  );
}

function OutroSlide({ data }: { data: RecapData }) {
  const headlines = useMemo(() => buildHeadlines(data), [data]);
  const onShare = async () => {
    const text = headlines.map((h) => `${h.label}: ${h.value}`).join('\n');
    const payload = {
      title: `mkxa ${data.year}`,
      text: `Vuestro ${data.year} en mkxa\n\n${text}`,
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(payload);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(payload.text);
        alert('Resumen copiado al portapapeles');
      }
    } catch {
      // user cancelled or share API not available — silent
    }
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <Caption>Vuestro {data.year} en mkxa</Caption>
      <div className="space-y-3">
        {headlines.map((h) => (
          <div key={h.label} className="rounded-card bg-white/75 p-4 shadow-card backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink/60">{h.label}</p>
            <p className="mt-1 font-sans text-[36px] font-extrabold leading-none text-ink">{h.value}</p>
          </div>
        ))}
      </div>
      <div className="pb-2">
        <button
          type="button"
          onClick={onShare}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-[16px] font-extrabold text-white shadow-card active:scale-[0.98]"
        >
          <Share2 size={18} strokeWidth={2.2} />
          Compartir
        </button>
        <Link
          href="/profile"
          className="mt-3 block text-center text-[12px] font-medium text-ink/70 underline"
        >
          Volver al perfil
        </Link>
      </div>
    </div>
  );
}

function EmptySlide({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/70">{title}</p>
      <p className="mt-4 font-sans text-[40px] font-extrabold leading-tight tracking-tightest text-ink">
        Sin datos
      </p>
      <p className="mt-2 text-[14px] text-ink/70">para este año</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small UI primitives
// ---------------------------------------------------------------------------
function Caption({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/70">{children}</p>;
}

function BigStat({ number, label }: { number: number; label: string }) {
  return (
    <div>
      <p className="font-sans text-[72px] font-extrabold leading-none tracking-tightest text-ink">{number}</p>
      <p className="mt-1 text-[14px] font-bold text-ink/70">{label}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full bg-white/70 px-4 py-3 text-[14px] text-ink shadow-card backdrop-blur-sm">
      {children}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatEuro(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function buildHeadlines(d: RecapData): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  if (d.mood.dominant) items.push({ label: 'Mood dominante', value: `${getMoodTokens(d.mood.dominant).label} · ${d.mood.days} días` });
  if (d.recipes.total > 0) items.push({ label: 'Recetas guardadas', value: String(d.recipes.total) });
  if (d.restaurants.visited > 0) items.push({ label: 'Restaurantes', value: String(d.restaurants.visited) });
  if (d.media.seen > 0) items.push({ label: 'Pelis y series', value: String(d.media.seen) });
  if (d.training.sessions > 0) items.push({ label: 'Sesiones HYROX', value: String(d.training.sessions) });
  if (d.expenses.total > 0) items.push({ label: 'Gastos', value: formatEuro(d.expenses.total) });
  if (d.shared.sameDayCount > 0) items.push({ label: 'Días en sintonía', value: String(d.shared.sameDayCount) });
  // Keep just 3 headline cards.
  return items.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Data loader — single Promise.all bundle. All queries are scoped by year
// where the table has a usable date column. For training (registros) we
// use updated_at since there is no per-row training date.
// ---------------------------------------------------------------------------
async function loadRecap(athlete: Athlete, year: number): Promise<RecapData> {
  const supa = supabaseClient();
  const fromISO = `${year}-01-01`;
  const toISO = `${year}-12-31`;
  const fromTs = `${year}-01-01T00:00:00Z`;
  const toTs = `${year + 1}-01-01T00:00:00Z`;
  const other: Athlete = athlete === 'MK' ? 'Xabi' : 'MK';

  const [
    moodMineRes,
    moodOtherRes,
    recipesRes,
    restaurantsRes,
    mediaRes,
    registrosRes,
    expensesRes,
  ] = await Promise.all([
    supa.from('mood_logs').select('date,mood').eq('athlete', athlete).gte('date', fromISO).lte('date', toISO),
    supa.from('mood_logs').select('date,mood').eq('athlete', other).gte('date', fromISO).lte('date', toISO),
    supa.from('recipes').select('created_by,meal_type,created_at').gte('created_at', fromTs).lt('created_at', toTs),
    supa.from('restaurants').select('*').eq('status', 'visited').gte('created_at', fromTs).lt('created_at', toTs),
    supa.from('media_items').select('title,vote_average,poster_path,genres,added_by,status,watched_at,updated_at').eq('status', 'seen'),
    supa.from('registros').select('athlete,week,day_key,completed,updated_at').eq('athlete', athlete).gte('updated_at', fromTs).lt('updated_at', toTs),
    supa.from('expenses').select('amount,category,description,date').gte('date', fromISO).lte('date', toISO),
  ]);

  const moodMine = (moodMineRes.data ?? []) as { date: string; mood: Mood }[];
  const moodOther = (moodOtherRes.data ?? []) as { date: string; mood: Mood }[];

  // -- Mood
  const moodCounts: Record<string, number> = {};
  for (const r of moodMine) {
    if (!isMood(r.mood)) continue;
    moodCounts[r.mood] = (moodCounts[r.mood] ?? 0) + 1;
  }
  const dominantEntry = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const dominant = dominantEntry && isMood(dominantEntry[0]) ? (dominantEntry[0] as Mood) : null;

  // -- Recipes
  const recipes = (recipesRes.data ?? []) as { created_by: 'MK' | 'Xabi' | null; meal_type: string | null }[];
  const recipeCounts = { MK: 0, Xabi: 0 };
  const mealTypeCounts: Record<string, number> = {};
  for (const r of recipes) {
    if (r.created_by === 'MK' || r.created_by === 'Xabi') recipeCounts[r.created_by] += 1;
    if (r.meal_type) mealTypeCounts[r.meal_type] = (mealTypeCounts[r.meal_type] ?? 0) + 1;
  }
  const topCreator: 'MK' | 'Xabi' | null =
    recipeCounts.MK === 0 && recipeCounts.Xabi === 0 ? null : recipeCounts.MK >= recipeCounts.Xabi ? 'MK' : 'Xabi';
  const topMealType = Object.entries(mealTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // -- Restaurants
  const restaurants = (restaurantsRes.data ?? []) as Restaurant[];
  const cuisineCounts: Record<string, number> = {};
  const spenderCounts: Record<string, number> = { MK: 0, Xabi: 0 };
  let bestRest: Restaurant | null = null;
  for (const r of restaurants) {
    if (r.cuisine) cuisineCounts[r.cuisine] = (cuisineCounts[r.cuisine] ?? 0) + 1;
    if (r.added_by === 'MK' || r.added_by === 'Xabi') spenderCounts[r.added_by] += 1;
    if (r.rating != null && (!bestRest || (bestRest.rating ?? 0) < r.rating)) bestRest = r;
  }
  const topCuisine = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topSpender: 'MK' | 'Xabi' | null =
    spenderCounts.MK === 0 && spenderCounts.Xabi === 0 ? null : spenderCounts.MK >= spenderCounts.Xabi ? 'MK' : 'Xabi';

  // -- Media (filter to year client-side since seen items may lack
  // watched_at; fall back to updated_at then created_at).
  const allSeen = (mediaRes.data ?? []) as {
    title: string; vote_average: number | null; poster_path: string | null;
    genres: string[] | null; status: string; watched_at: string | null; updated_at: string | null;
  }[];
  const seenThisYear = allSeen.filter((m) => {
    const stamp = m.watched_at || m.updated_at;
    if (!stamp) return false;
    return stamp.startsWith(String(year));
  });
  const genreCounts: Record<string, number> = {};
  let topMovie: { title: string; poster_path: string | null; vote_average: number | null } | null = null;
  for (const m of seenThisYear) {
    for (const g of m.genres ?? []) genreCounts[g] = (genreCounts[g] ?? 0) + 1;
    if (m.vote_average != null && (!topMovie || (topMovie.vote_average ?? 0) < m.vote_average)) {
      topMovie = { title: m.title, poster_path: m.poster_path, vote_average: m.vote_average };
    }
  }
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // -- Training: sesiones completed for athlete + longest streak of
  // consecutive weeks with >=1 completed + favourite session title (by
  // day_key — we only have D1..D4, so we use the plan title from PLAN
  // for that week is overkill; report the most frequent day_key label
  // as a proxy).
  const registros = (registrosRes.data ?? []) as { week: number; day_key: string; completed: boolean | null }[];
  const completed = registros.filter((r) => r.completed);
  const sessions = completed.length;
  const weeksWithCompleted = new Set<number>(completed.map((r) => r.week));
  const sortedWeeks = Array.from(weeksWithCompleted).sort((a, b) => a - b);
  let longestStreak = 0;
  let currentStreak = 0;
  let lastWeek: number | null = null;
  for (const w of sortedWeeks) {
    if (lastWeek === null || w === lastWeek + 1) currentStreak += 1;
    else currentStreak = 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    lastWeek = w;
  }
  const dayKeyCounts: Record<string, number> = {};
  for (const r of completed) dayKeyCounts[r.day_key] = (dayKeyCounts[r.day_key] ?? 0) + 1;
  const topDayKey = Object.entries(dayKeyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const dayKeyLabels: Record<string, string> = { D1: 'Fuerza', D2: 'Z2 Suave', D3: 'Intervalos', D4: 'Mixto' };
  const favouriteTitle = topDayKey ? dayKeyLabels[topDayKey] ?? topDayKey : null;

  // -- Expenses
  const expenses = (expensesRes.data ?? []) as { amount: number; category: string; description: string | null; date: string }[];
  const expTotal = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const catTotals: Record<string, number> = {};
  let biggest: { amount: number; description: string | null } | null = null;
  for (const e of expenses) {
    const amt = Number(e.amount);
    catTotals[e.category] = (catTotals[e.category] ?? 0) + amt;
    if (!biggest || amt > biggest.amount) biggest = { amount: amt, description: e.description };
  }
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // -- Shared mood: same-day overlap between both athletes.
  const otherMap = new Map<string, Mood>();
  for (const r of moodOther) if (isMood(r.mood)) otherMap.set(r.date, r.mood);
  let sameDayCount = 0;
  let happyOverlap = 0;
  let sadOverlap = 0;
  for (const r of moodMine) {
    if (!isMood(r.mood)) continue;
    const otherMood = otherMap.get(r.date);
    if (!otherMood) continue;
    sameDayCount += 1;
    if (HAPPY_MOODS.has(r.mood) && HAPPY_MOODS.has(otherMood)) happyOverlap += 1;
    else if (SAD_MOODS.has(r.mood) && SAD_MOODS.has(otherMood)) sadOverlap += 1;
  }

  return {
    year,
    athlete,
    mood: { days: moodMine.length, dominant, counts: moodCounts },
    recipes: { total: recipes.length, topCreator, counts: recipeCounts, topMealType },
    restaurants: { visited: restaurants.length, topCuisine, topSpender, winner: bestRest },
    media: { seen: seenThisYear.length, topGenre, topMovie },
    training: { sessions, longestStreak, favouriteTitle },
    expenses: { total: expTotal, topCategory, biggest },
    shared: { sameDayCount, happyOverlap, sadOverlap },
  };
}

