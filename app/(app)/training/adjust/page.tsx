'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { AdjustContextBox } from '@/components/training/AdjustContextBox';
import { AdjustPreview } from '@/components/training/AdjustPreview';
import { MoodBlob } from '@/components/mood/MoodBlob';
import { useAthlete } from '@/lib/athlete-context';
import { getCurrentWeek } from '@/lib/plan-hyrox';
import { supabaseClient } from '@/lib/supabase/client';
import type { GeneratedWeek } from '@/lib/training/generated';
import type { Athlete } from '@/lib/athlete-context';

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

  // Watermark = newest draft id at the moment of clicking Generar. Anything
  // newer than this for (athlete, week) is the server's response — used by
  // the resume-after-disconnect poller below.
  const generationStartedAt = useRef<string | null>(null);

  // Resume an in-flight generation if the user returns to the page after
  // backgrounding the phone: any draft inserted after `generationStartedAt`
  // for (athlete, week) is the result we missed.
  useEffect(() => {
    if (!busy || !athlete || !generationStartedAt.current) return;
    let stopped = false;
    const baseline = generationStartedAt.current;

    async function pollForResult() {
      const { data, error } = await supabaseClient()
        .from('training_weeks')
        .select('id,plan_jsonb,created_at')
        .eq('athlete', athlete as Athlete)
        .eq('week', targetWeek)
        .eq('status', 'draft')
        .gt('created_at', baseline)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (stopped) return null;
      if (error || !data) return null;
      const row = data as { id: string; plan_jsonb: GeneratedWeek };
      return row;
    }

    const interval = setInterval(async () => {
      const row = await pollForResult();
      if (!row || stopped) return;
      setWeekId(row.id);
      setPlan(row.plan_jsonb);
      setBusy(false);
      stopped = true;
      clearInterval(interval);
    }, 4000);

    return () => { stopped = true; clearInterval(interval); };
  }, [busy, athlete, targetWeek]);

  async function generate() {
    if (!athlete) return;
    setBusy(true); setError(null); setPlan(null); setWeekId(null);
    // Stamp the baseline for the resume-poller: nowISO before we kick off.
    generationStartedAt.current = new Date().toISOString();

    try {
      const res = await fetch('/api/training/generate-week', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ athlete, target_week: targetWeek, extra_prompt: extraPrompt }),
        // keepalive lets the request keep flying even if the page is
        // backgrounded for short periods (Safari respects this on POST).
        keepalive: true,
      });
      if (!res.ok) {
        if (res.status === 429) {
          const body = await res.json().catch(() => ({})) as { retry_after_seconds?: number };
          const wait = body.retry_after_seconds ?? 60;
          setError(`Demasiadas peticiones a Claude. Espera ${wait}s y vuelve a intentarlo.`);
        } else {
          const body = await res.json().catch(() => ({})) as { error?: string; detail?: string };
          setError(body.detail ?? body.error ?? `Error ${res.status}`);
        }
        return;
      }
      const body = await res.json() as { week_id: string; plan: GeneratedWeek };
      setWeekId(body.week_id);
      setPlan(body.plan);
    } catch (e) {
      // Network failure (phone slept long enough to drop the connection):
      // leave busy=true so the resume-poller can pick up the draft when
      // the server eventually finishes.
      console.error('[adjust] fetch error, poller will resume', e);
      return;
    } finally {
      // Only clear busy on a clean path; if we got here via catch + return,
      // the poller is in charge. The finally still runs but we already
      // returned, so busy state stays for the poller.
    }
    setBusy(false);
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
