'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { AdjustContextBox } from '@/components/training/AdjustContextBox';
import { AdjustPreview } from '@/components/training/AdjustPreview';
import { MoodBlob } from '@/components/mood/MoodBlob';
import { useAthlete } from '@/lib/athlete-context';
import { getCurrentWeek } from '@/lib/plan-hyrox';
import { supabaseClient } from '@/lib/supabase/client';
import type { GeneratedWeek } from '@/lib/training/generated';
import type { Athlete } from '@/lib/athlete-context';

type PairResult = {
  weekly_note: string;
  mk: { week_id: string; plan: GeneratedWeek };
  xabi: { week_id: string; plan: GeneratedWeek };
};

export default function AdjustPage() {
  const sp = useSearchParams();
  const athlete = useAthlete();
  const defaultWeek = Number(sp.get('week') ?? '') || Math.min(23, getCurrentWeek() + 1);

  const [targetWeek, setTargetWeek] = useState<number>(defaultWeek);
  const [extraPrompt, setExtraPrompt] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState<PairResult | null>(null);
  // Active athlete tab in the preview (just visual — both plans are saved on accept)
  const [activeTab, setActiveTab] = useState<Athlete>('MK');

  useEffect(() => setError(null), [targetWeek, extraPrompt]);

  // Watermark = newest draft id at the moment of clicking Generar. Anything
  // newer than this for (athlete, week) is the server's response — used by
  // the resume-after-disconnect poller below.
  const generationStartedAt = useRef<string | null>(null);

  // Resume an in-flight generation: poll for BOTH athletes' newest drafts
  // created after `generationStartedAt`. Once both are present, reconstruct
  // the PairResult locally and unlock the UI.
  useEffect(() => {
    if (!busy || !generationStartedAt.current) return;
    let stopped = false;
    const baseline = generationStartedAt.current;

    async function pollPair() {
      const supa = supabaseClient();
      async function fetchLatest(a: Athlete) {
        const { data } = await supa
          .from('training_weeks')
          .select('id,plan_jsonb,weekly_note,created_at')
          .eq('athlete', a)
          .eq('week', targetWeek)
          .eq('status', 'draft')
          .gt('created_at', baseline)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as { id: string; plan_jsonb: GeneratedWeek; weekly_note: string } | null;
      }
      const [mkRow, xabiRow] = await Promise.all([fetchLatest('MK'), fetchLatest('Xabi')]);
      if (stopped) return;
      if (mkRow && xabiRow) {
        setPair({
          weekly_note: mkRow.weekly_note ?? '',
          mk: { week_id: mkRow.id, plan: mkRow.plan_jsonb },
          xabi: { week_id: xabiRow.id, plan: xabiRow.plan_jsonb },
        });
        setBusy(false);
        stopped = true;
      }
    }

    const interval = setInterval(() => { void pollPair(); }, 4000);
    return () => { stopped = true; clearInterval(interval); };
  }, [busy, targetWeek]);

  async function generate() {
    setBusy(true); setError(null); setPair(null);
    generationStartedAt.current = new Date().toISOString();

    try {
      const res = await fetch('/api/training/generate-week', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target_week: targetWeek, extra_prompt: extraPrompt }),
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
      const body = await res.json() as PairResult;
      setPair(body);
    } catch (e) {
      console.error('[adjust] fetch error, poller will resume', e);
      return;
    }
    setBusy(false);
  }

  async function accept() {
    if (!pair) return;
    setBusy(true);
    try {
      const res = await fetch('/api/training/confirm-week', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ week_ids: [pair.mk.week_id, pair.xabi.week_id] }),
      });
      if (!res.ok) { setError(await res.text()); return; }
      // Full reload — Next.js SPA navigation sometimes keeps /training mounted
      // with stale confirmedPlan state. window.location forces a clean fetch.
      window.location.assign(`/training?week=${targetWeek}`);
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

      {!pair && (
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

          <p className="text-[12px] text-ink-muted">
            Generación común para MK + Xabi. Procesa los registros de los dos y devuelve ambos planes con cargas individualizadas por RM.
          </p>

          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Contexto MK</p>
            <AdjustContextBox athlete="MK" week={targetWeek} />
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Contexto Xabi</p>
            <AdjustContextBox athlete="Xabi" week={targetWeek} />
          </div>

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
            {busy ? <>Pidiendo a Claude… <MoodBlob mood="worried" size={28} withFloor={false} withParticles={false} animate /></> : 'Generar (MK + Xabi)'}
          </button>
        </section>
      )}

      {pair && (
        <section className="flex flex-col gap-3">
          {pair.weekly_note && (
            <div className="mx-4 rounded-card bg-white p-4 shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Nota común de la semana</p>
              <p className="mt-1 text-[13px] text-ink">{pair.weekly_note}</p>
            </div>
          )}
          <div role="tablist" aria-label="Atleta" className="relative mx-4 grid grid-cols-2 rounded-full bg-white p-1.5 shadow-action">
            <span
              aria-hidden
              className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/2)] rounded-full bg-ink transition-transform duration-200 ease-out"
              style={{ transform: `translateX(${activeTab === 'MK' ? 0 : 100}%)` }}
            />
            {(['MK', 'Xabi'] as const).map((a) => (
              <button
                key={a}
                role="tab"
                aria-selected={activeTab === a}
                onClick={() => setActiveTab(a)}
                className={`relative z-10 py-2 text-[13px] font-bold ${activeTab === a ? 'text-white' : 'text-ink-muted'}`}
              >
                {a}
              </button>
            ))}
          </div>
          <AdjustPreview
            plan={activeTab === 'MK' ? pair.mk.plan : pair.xabi.plan}
            busy={busy}
            onAccept={() => accept()}
            onRegenerate={() => { setPair(null); }}
          />
        </section>
      )}
    </main>
  );
}
