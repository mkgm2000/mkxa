'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';

interface ProgressPayload {
  phase: 'queued' | 'extracting' | 'saving' | 'completed' | 'failed';
  processed: number;
  total: number;
  message: string;
}

interface Row {
  import_status: ProgressPayload['phase'];
  import_progress: ProgressPayload | null;
  item_count: number;
}

const PHASE_LABEL: Record<ProgressPayload['phase'], string> = {
  queued:     'En cola en GitHub Actions…',
  extracting: 'Pidiendo la lista a TikTok…',
  saving:     'Guardando vídeos',
  completed:  'Listo',
  failed:     'Error',
};

// Polls recipe_collections.import_status / import_progress every 2 s and
// renders a phased progress bar. Reusable from /meals?tab=recetas (new
// import) and from the collection detail page (refresh).
export function CollectionImportProgress({ collectionId }: { collectionId: string }) {
  const [row, setRow] = useState<Row | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const { data } = await supabaseClient()
        .from('recipe_collections')
        .select('import_status,import_progress,item_count')
        .eq('id', collectionId)
        .maybeSingle();
      if (cancelled || !data) return;
      setRow(data as Row);
    }
    void tick();
    const t = setInterval(() => { void tick(); }, 2500);
    return () => { cancelled = true; clearInterval(t); };
  }, [collectionId]);

  const status: ProgressPayload['phase'] = row?.import_status ?? 'queued';
  const progress = row?.import_progress;
  const total = progress?.total ?? 0;
  const processed = progress?.processed ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : status === 'extracting' ? 25 : status === 'queued' ? 8 : 0;
  const failed = status === 'failed';

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center justify-center gap-3">
        {failed
          ? <AlertCircle size={28} className="text-danger" aria-hidden />
          : <Loader2 size={28} className="animate-spin text-ink" aria-hidden />
        }
        <div>
          <p className="text-[13px] font-extrabold text-ink">
            {PHASE_LABEL[status]}
          </p>
          {progress?.message && (
            <p className="text-[11px] text-ink-muted">{progress.message}</p>
          )}
        </div>
      </div>

      {/* Progress bar — animates while phase is saving. For other phases
          the bar still moves so the user knows something is happening. */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-soft">
        <div
          className={`h-full ${failed ? 'bg-danger' : 'bg-ink'} transition-[width] duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {total > 0 && status !== 'completed' && (
        <p className="text-center text-[12px] font-bold tabular-nums text-ink">
          {processed.toLocaleString('es-ES')} / {total.toLocaleString('es-ES')} vídeos
          <span className="ml-2 text-ink-muted">faltan {Math.max(0, total - processed).toLocaleString('es-ES')}</span>
        </p>
      )}

      {status === 'completed' && (
        <p className="text-center text-[12px] font-bold text-ink">
          Colección con {(row?.item_count ?? 0).toLocaleString('es-ES')} vídeos guardada.
        </p>
      )}
    </div>
  );
}
