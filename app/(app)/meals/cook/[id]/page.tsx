'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Hourglass, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { TikTokEmbed } from '@/components/meals/TikTokEmbed';
import { useRecipe, updateRecipeIngredients } from '@/lib/hooks/use-recipes';

interface IngDraft {
  name: string;
  quantity: string;
  unit: string;
}

export default function CookPage({ params }: { params: { id: string } }) {
  const { recipe, loading, refresh } = useRecipe(params.id);
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<IngDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Seed drafts from the loaded recipe whenever we (re-)enter edit mode.
  useEffect(() => {
    if (!editing || !recipe) return;
    setDrafts(
      recipe.ingredients.map((ing) => ({
        name: ing.name ?? '',
        quantity: ing.quantity != null ? String(ing.quantity) : '',
        unit: ing.unit ?? '',
      })),
    );
    setErr(null);
  }, [editing, recipe]);

  const toggle = (key: string) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  async function saveIngredients() {
    if (!recipe) return;
    setSaving(true);
    setErr(null);
    const cleaned = drafts
      .map((d, idx) => {
        const q = d.quantity.trim() ? Number(d.quantity.replace(',', '.')) : null;
        return {
          name: d.name.trim(),
          quantity: q != null && Number.isFinite(q) ? q : null,
          unit: d.unit.trim() || null,
          aisle: 'otros' as const,
          optional: false,
          position: idx,
        };
      })
      .filter((d) => d.name.length > 0);
    const res = await updateRecipeIngredients(recipe.id, cleaned);
    setSaving(false);
    if ('error' in res) { setErr(res.error); return; }
    await refresh();
    setEditing(false);
  }

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
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Ingredientes
            </h2>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Editar ingredientes"
                className="flex h-7 items-center gap-1 rounded-full border border-ink-soft px-2.5 text-[11px] font-bold text-ink active:scale-95"
              >
                <Pencil size={11} strokeWidth={1.75} aria-hidden />
                Editar
              </button>
            )}
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Cancelar edición"
                disabled={saving}
                className="flex h-7 items-center justify-center rounded-full border border-ink-soft px-2 text-ink-muted active:scale-95 disabled:opacity-40"
              >
                <X size={14} strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </div>

          {!editing && recipe.ingredients.length === 0 && (
            <p className="text-[13px] text-ink-muted">Sin ingredientes guardados.</p>
          )}

          {!editing && recipe.ingredients.length > 0 && (
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

          {editing && (
            <div className="flex flex-col gap-2">
              {drafts.length === 0 && (
                <p className="text-[12px] text-ink-muted">Sin ingredientes. Añade el primero.</p>
              )}
              {drafts.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    aria-label="Nombre"
                    value={d.name}
                    onChange={(e) => {
                      const next = [...drafts]; next[i] = { ...next[i], name: e.target.value };
                      setDrafts(next);
                    }}
                    placeholder="Ingrediente"
                    className="min-w-0 flex-1 rounded-action border border-ink-soft bg-white px-2.5 py-2 text-[13px] outline-none focus:border-ink"
                  />
                  <input
                    aria-label="Cantidad"
                    value={d.quantity}
                    onChange={(e) => {
                      const next = [...drafts]; next[i] = { ...next[i], quantity: e.target.value };
                      setDrafts(next);
                    }}
                    placeholder="qty"
                    inputMode="decimal"
                    className="w-14 rounded-action border border-ink-soft bg-white px-2 py-2 text-[13px] tabular-nums outline-none focus:border-ink"
                  />
                  <input
                    aria-label="Unidad"
                    value={d.unit}
                    onChange={(e) => {
                      const next = [...drafts]; next[i] = { ...next[i], unit: e.target.value };
                      setDrafts(next);
                    }}
                    placeholder="ud"
                    className="w-16 rounded-action border border-ink-soft bg-white px-2 py-2 text-[13px] outline-none focus:border-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}
                    aria-label="Eliminar fila"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-action text-ink-muted active:scale-95"
                  >
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDrafts([...drafts, { name: '', quantity: '', unit: '' }])}
                className="flex items-center justify-center gap-1.5 rounded-action border border-dashed border-ink-soft px-3 py-2 text-[12px] font-bold text-ink-muted active:scale-95"
              >
                <Plus size={12} strokeWidth={1.75} aria-hidden />
                Añadir ingrediente
              </button>
              {err && (
                <p className="rounded-action bg-danger/10 px-2.5 py-1.5 text-[11px] text-danger">{err}</p>
              )}
              <button
                type="button"
                onClick={saveIngredients}
                disabled={saving}
                className="mt-1 flex h-10 items-center justify-center rounded-action bg-ink text-[13px] font-bold text-white active:scale-95 disabled:opacity-40"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
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
