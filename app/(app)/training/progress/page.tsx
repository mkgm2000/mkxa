'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';
import { ProgressHeatmap } from '@/components/training/ProgressHeatmap';
import { useAthlete } from '@/lib/athlete-context';
import { useTrainingAll } from '@/lib/hooks/use-training-all';
import { getCurrentWeek, MAX_WEEK } from '@/lib/plan-hyrox';

export default function TrainingProgressPage() {
  const router = useRouter();
  const athlete = useAthlete();
  const currentWeek = useMemo(() => Math.min(getCurrentWeek(), MAX_WEEK), []);
  const { rows, loading } = useTrainingAll(athlete, currentWeek);

  if (!athlete) return null;

  return (
    <main className="flex flex-col gap-5 pt-2">
      <header className="flex items-start justify-between gap-4 px-5 pt-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Atleta: {athlete}
          </p>
          <h1 className="mt-1 font-sans text-[40px] font-extrabold leading-[1.02] tracking-tightest text-ink">
            Progresión
          </h1>
          <p className="mt-2 text-[12px] text-ink-muted">
            Últimas {rows.length} semana{rows.length === 1 ? '' : 's'} · RPE por sesión
          </p>
        </div>
        <HeaderActionButton
          icon={ChevronLeft}
          label="Volver"
          onClick={() => router.push('/training')}
        />
      </header>

      <section className="px-1">
        {loading ? (
          <p className="px-5 text-[13px] text-ink-muted">Cargando…</p>
        ) : (
          <ProgressHeatmap rows={rows} />
        )}
      </section>
    </main>
  );
}
