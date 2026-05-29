'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { AdjustContextBox } from '@/components/training/AdjustContextBox';
import { AdjustPreview } from '@/components/training/AdjustPreview';
import { MoodBlob } from '@/components/mood/MoodBlob';
import { useAthlete } from '@/lib/athlete-context';
import { getCurrentWeek } from '@/lib/plan-hyrox';
import type { GeneratedWeek } from '@/lib/training/generated';

export default function AdjustPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const athlete = useAthlete();
  const defaultWeek = Number(sp.get('week') ?? '') || Math.min(23, getCurrentWeek() + 1);

  const [targetWeek, setTargetWeek] = useState<number>(defaultWeek);
  const [extraPrompt, setExtraPrompt] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [weekId, setWeekId] = useState<string | null>(null);
  const [plan, setPlan] = useState<GeneratedWeek | null>(null);

  useEffect(() => setError(null), [targetWeek, extraPrompt]);

  async function generate() {
    if (!athlete) return;
    setBusy(true); setError(null); setPlan(null); setWeekId(null);
    try {
      const res = await fetch('/api/training/generate-week', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ athlete, target_week: targetWeek, extra_prompt: extraPrompt }),
      });
      if (!res.ok) { setError(await res.text()); return; }
      const body = await res.json() as { week_id: string; plan: GeneratedWeek };
      setWeekId(body.week_id);
      setPlan(body.plan);
    } finally {
      setBusy(false);
    }
  }

  async function accept(edited: GeneratedWeek) {
    if (!weekId) return;
    setBusy(true);
    try {
      const res = await fetch('/api/training/confirm-week', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ week_id: weekId }),
      });
      if (!res.ok) { setError(await res.text()); return; }
      void edited;
      router.push(`/training?week=${targetWeek}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-col gap-5 px-1 pb-6 pt-4">
      <header className="flex items-center justify-between px-4">
        <Link href="/training" aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">Ajustar próxima semana</h1>
        <span aria-hidden className="h-10 w-10" />
      </header>

      {!plan && (
        <section className="flex flex-col gap-4 px-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">Semana objetivo</span>
            <select
              value={targetWeek}
              onChange={(e) => setTargetWeek(Number(e.target.value))}
              className="rounded-md border border-ink-soft bg-white px-3 py-1 text-[14px]"
              aria-label="Semana objetivo"
            >
              {Array.from({ length: 23 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>S{w}</option>
              ))}
            </select>
          </div>

          {athlete && <AdjustContextBox athlete={athlete} week={targetWeek} />}

          <label className="flex flex-col gap-1 text-[13px] text-ink">
            Notas para la generación (opcional)
            <textarea
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Énfasis en sled, semana cómoda…"
              className="rounded-action border border-ink-soft bg-white px-3 py-2 text-[14px] outline-none focus:border-ink"
            />
          </label>

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <button
            type="button"
            onClick={generate}
            disabled={busy || !athlete}
            className="flex items-center justify-center gap-3 rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-40"
          >
            {busy ? <>Pidiendo a Claude… <MoodBlob mood="worried" size={28} withFloor={false} withParticles={false} animate /></> : 'Generar'}
          </button>
        </section>
      )}

      {plan && (
        <AdjustPreview
          plan={plan}
          busy={busy}
          onAccept={accept}
          onRegenerate={() => { setPlan(null); setWeekId(null); }}
        />
      )}
    </main>
  );
}
