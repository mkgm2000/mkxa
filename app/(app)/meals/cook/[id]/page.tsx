'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Hourglass, Check } from 'lucide-react';
import { TikTokEmbed } from '@/components/meals/TikTokEmbed';
import { useRecipe } from '@/lib/hooks/use-recipes';

export default function CookPage({ params }: { params: { id: string } }) {
  const { recipe, loading } = useRecipe(params.id);
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <main className="flex flex-col gap-3 px-1 pt-4 pb-6">
        <p className="px-5 text-[13px] text-ink-muted">Cargando…</p>
      </main>
    );
  }

  if (!recipe) {
    return (
      <main className="flex flex-col items-center gap-4 px-5 pt-10 pb-6">
        <p className="text-[14px] text-ink-muted">Receta no encontrada.</p>
        <Link
          href="/meals?tab=semana"
          className="rounded-action bg-ink px-4 py-2 text-[13px] font-bold text-white"
        >
          Volver al plan
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 px-1 pt-4 pb-10">
      <header className="flex items-center justify-between px-4">
        <Link
          href="/meals?tab=semana"
          aria-label="Volver al plan"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="flex-1 truncate px-2 text-center font-sans text-[18px] font-extrabold tracking-tightest text-ink">
          {recipe.title}
        </h1>
        <span aria-hidden className="h-10 w-10" />
      </header>

      <section className="px-4">
        <TikTokEmbed url={recipe.source_url} />
      </section>

      <section className="px-4">
        <div className="rounded-card bg-white p-4 shadow-card">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Ingredientes
          </h2>
          {recipe.ingredients.length === 0 ? (
            <p className="text-[13px] text-ink-muted">Sin ingredientes guardados.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {recipe.ingredients.map((ing, idx) => {
                const key = ing.id ?? `ing-${idx}`;
                const isChecked = !!checked[key];
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      aria-pressed={isChecked}
                      className={`flex w-full items-center justify-between gap-3 rounded-action px-2 py-2 text-left transition ${
                        isChecked ? 'opacity-60' : ''
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            isChecked
                              ? 'border-ink bg-ink text-white'
                              : 'border-ink-soft bg-white text-transparent'
                          }`}
                          aria-hidden
                        >
                          <Check size={12} strokeWidth={2} />
                        </span>
                        <span
                          className={`text-[14px] text-ink ${
                            isChecked ? 'line-through' : ''
                          }`}
                        >
                          {ing.name}
                        </span>
                      </span>
                      <span className="text-[12px] tabular-nums text-ink-muted">
                        {ing.quantity ?? ''}
                        {ing.unit ? ` ${ing.unit}` : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="px-4">
        <div className="rounded-card bg-white p-4 shadow-card">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Pasos
          </h2>
          {recipe.steps.length === 0 ? (
            <p className="text-[13px] text-ink-muted">Esta receta no tiene pasos guardados.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {recipe.steps.map((st, i) => (
                <li
                  key={st.id ?? `step-${i}`}
                  className="flex gap-3 rounded-action bg-ink-soft/40 p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-[14px] leading-snug text-ink">{st.body}</p>
                    {st.timer_min != null && st.timer_min > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-ink-muted">
                        <Hourglass size={11} strokeWidth={1.5} aria-hidden />
                        {st.timer_min} min
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <div className="px-4 pt-2">
        <button
          type="button"
          onClick={() => router.push('/meals?tab=semana')}
          className="flex h-12 w-full items-center justify-center rounded-action bg-ink text-[14px] font-bold text-white"
        >
          Terminada
        </button>
      </div>
    </main>
  );
}
