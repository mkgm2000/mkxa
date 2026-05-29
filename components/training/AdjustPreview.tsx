'use client';

import { useState } from 'react';
import { RationaleNote } from './RationaleNote';
import type { GeneratedWeek, GeneratedDay, GeneratedBlock } from '@/lib/training/generated';

interface Props {
  plan: GeneratedWeek;
  onAccept: (edited: GeneratedWeek) => Promise<void> | void;
  onRegenerate: () => void;
  busy?: boolean;
}

export function AdjustPreview({ plan, onAccept, onRegenerate, busy }: Props) {
  const [draft, setDraft] = useState<GeneratedWeek>(plan);

  function updateBlock(dayIdx: number, blockIdx: number, patch: Partial<GeneratedBlock>) {
    setDraft((d) => {
      const days = d.days.map((day, i) => {
        if (i !== dayIdx) return day;
        const blocks = day.blocks.map((b, j) => (j === blockIdx ? { ...b, ...patch } : b));
        return { ...day, blocks } as GeneratedDay;
      });
      return { ...d, days };
    });
  }

  return (
    <section className="flex flex-col gap-4 px-1 pb-6">
      <RationaleNote text={draft.weekly_note} variant="weekly" initiallyOpen />

      {draft.days.map((day, di) => (
        <article key={day.key} className="mx-4 rounded-card bg-white p-4 shadow-card">
          <header className="flex items-baseline gap-2">
            <span className="rounded-pill bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
              {day.key}
            </span>
            <h3 className="font-sans text-[16px] font-extrabold text-ink">{day.title}</h3>
            <span className="ml-auto text-[11px] font-medium text-ink-muted">{day.rpe}</span>
          </header>

          <ul className="mt-3 flex flex-col gap-2">
            {day.blocks.map((b, bi) => (
              <li key={bi} className="flex flex-col gap-1 border-b border-ink-soft py-1 last:border-b-0">
                <input
                  value={b.name}
                  onChange={(e) => updateBlock(di, bi, { name: e.target.value })}
                  aria-label={`${day.key} bloque ${bi + 1} nombre`}
                  className="bg-transparent text-[14px] font-bold text-ink outline-none"
                />
                <div className="flex gap-2">
                  <input
                    value={b.sets}
                    onChange={(e) => updateBlock(di, bi, { sets: e.target.value })}
                    aria-label={`${day.key} bloque ${bi + 1} sets`}
                    className="w-28 bg-transparent text-[12px] tabular-nums text-ink outline-none"
                  />
                  <input
                    value={b.load}
                    onChange={(e) => updateBlock(di, bi, { load: e.target.value })}
                    aria-label={`${day.key} bloque ${bi + 1} carga`}
                    className="flex-1 bg-transparent text-[12px] tabular-nums text-ink outline-none"
                  />
                </div>
              </li>
            ))}
          </ul>

          <RationaleNote text={day.rationale} variant="day" />
        </article>
      ))}

      <div className="mx-4 mt-2 flex gap-2">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          className="flex-1 rounded-action border border-ink-soft py-3 text-[14px] font-medium text-ink disabled:opacity-40"
        >
          Regenerar
        </button>
        <button
          type="button"
          onClick={() => onAccept(draft)}
          disabled={busy}
          className="flex-1 rounded-action bg-ink py-3 text-[14px] font-bold text-white disabled:opacity-40"
        >
          Aceptar plan
        </button>
      </div>
    </section>
  );
}
