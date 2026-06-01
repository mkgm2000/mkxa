'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

type Modality = 'women' | 'men' | 'mixed';

interface Station {
  name: string;
  meta?: string;
  women: string;
  men: string;
  mixed: string;
}

const STATIONS: Station[] = [
  { name: 'Ski Erg',                                  women: '1000m',           men: '1000m',           mixed: '1000m' },
  { name: 'Sled Push',         meta: '4 × 12,5m',     women: '102 kg',          men: '152 kg',          mixed: '152 kg' },
  { name: 'Sled Pull',         meta: '4 × 12,5m',     women: '78 kg',           men: '103 kg',          mixed: '103 kg' },
  { name: 'Burpee Broad Jump',                        women: '80m',             men: '80m',             mixed: '80m' },
  { name: 'Rowing',                                   women: '1000m',           men: '1000m',           mixed: '1000m' },
  { name: "Farmer's Carry",    meta: '200m',          women: '2 × 16 kg',       men: '2 × 24 kg',       mixed: '2 × 24 kg' },
  { name: 'Sandbag Lunges',    meta: '100m',          women: '10 kg',           men: '20 kg',           mixed: '20 kg' },
  { name: 'Wall Balls',                               women: '75 reps · 4 kg',  men: '100 reps · 6 kg', mixed: '100 reps · 6 kg' },
];

const MOD_LABELS: Record<Modality, string> = {
  women: 'Doubles Women',
  men: 'Doubles Men',
  mixed: 'Doubles Mixed',
};

export default function HyroxTablePage() {
  const [highlight, setHighlight] = useState<Modality>('mixed');

  return (
    <main className="flex flex-col gap-5 px-1 pt-4 pb-10">
      <header className="flex items-center justify-between px-4">
        <Link
          href="/training"
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">
          HYROX · Cargas competición
        </h1>
        <span aria-hidden className="h-10 w-10" />
      </header>

      <div className="px-4">
        <div role="tablist" aria-label="Categoría destacada" className="relative grid grid-cols-3 rounded-full bg-white p-1.5 shadow-action">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/3)] rounded-full bg-ink transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${['women', 'men', 'mixed'].indexOf(highlight) * 100}%)` }}
          />
          {(['women', 'men', 'mixed'] as Modality[]).map((m) => {
            const active = m === highlight;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                onClick={() => setHighlight(m)}
                className={`relative z-10 py-2 text-[12px] font-bold uppercase tracking-[0.06em] transition-colors ${
                  active ? 'text-white' : 'text-ink-muted'
                }`}
              >
                {m === 'women' ? 'Women' : m === 'men' ? 'Men' : 'Mixed'}
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-[11px] text-ink-muted">
          MK + Xabi compiten en <strong className="text-ink">Doubles Mixed</strong>. La columna destacada se resalta abajo.
        </p>
      </div>

      <div className="overflow-hidden rounded-card bg-white shadow-card mx-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted" />
                {(['women', 'men', 'mixed'] as Modality[]).map((m) => (
                  <th
                    key={m}
                    className={`px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-[0.1em] ${
                      m === highlight ? 'bg-ink text-white' : 'bg-ink-soft/30 text-ink'
                    }`}
                  >
                    {MOD_LABELS[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATIONS.map((s, idx) => (
                <tr key={s.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-ink-soft/15'}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 min-w-[120px] max-w-[160px] px-3 py-3 align-middle text-[12px] font-extrabold uppercase tracking-[0.02em] text-ink"
                    style={{ background: '#FFE600' }}
                  >
                    <div>{s.name}</div>
                    {s.meta && (
                      <div className="mt-0.5 text-[10px] font-bold text-ink-muted">{s.meta}</div>
                    )}
                  </th>
                  {(['women', 'men', 'mixed'] as Modality[]).map((m) => (
                    <td
                      key={m}
                      className={`px-3 py-3 text-center text-[13px] font-medium tabular-nums whitespace-nowrap ${
                        m === highlight ? 'font-bold text-ink' : 'text-ink-muted'
                      }`}
                    >
                      {s[m]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mx-4 rounded-card bg-white/60 p-4 text-[11px] leading-relaxed text-ink-muted shadow-item">
        <p className="font-bold text-ink">Orden oficial de estaciones (Rulebook §6):</p>
        <ol className="mt-2 space-y-0.5 list-decimal pl-5">
          <li>1km Run → Ski Erg 1000m</li>
          <li>1km Run → Sled Push 4×12,5m</li>
          <li>1km Run → Sled Pull 4×12,5m</li>
          <li>1km Run → Burpee Broad Jump 80m</li>
          <li>1km Run → Rowing 1000m</li>
          <li>1km Run → Farmer&apos;s Carry 200m</li>
          <li>1km Run → Sandbag Lunges 100m</li>
          <li>1km Run → Wall Balls (75/100 reps)</li>
        </ol>
        <p className="mt-3">
          En Doubles se reparten reps libremente con el compañero (excepto Sled Push/Pull, Farmer&apos;s Carry y Sandbag Lunges, que se realizan completas por un solo atleta antes del relevo).
        </p>
      </div>
    </main>
  );
}
