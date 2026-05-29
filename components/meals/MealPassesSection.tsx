'use client';

import { MealPassTicket } from './MealPassTicket';
import { useMealPasses } from '@/lib/hooks/use-meal-passes';
import { MESES_ES } from '@/lib/meals/meal-passes';

const STAGE_BG = '#f3e9d8';

function Plate({ filled }: { filled: boolean }) {
  return (
    <svg className="mp-plate" viewBox="0 0 26 26" fill="none" aria-hidden>
      <circle cx="13" cy="13" r="11" stroke={filled ? '#e0533b' : '#cdbfa8'} strokeWidth="1.8" fill={filled ? '#fbe2d6' : 'transparent'} />
      <circle cx="13" cy="13" r="5.5" stroke={filled ? '#e0533b' : '#cdbfa8'} strokeWidth="1.6" />
    </svg>
  );
}

export function MealPassesSection() {
  const { passes, loading, remaining, monthLabel, redeem, setPlace } = useMealPasses();
  const now = new Date();
  const nextMonth = MESES_ES[(now.getMonth() + 1) % 12];

  return (
    <section className="mp-stage flex flex-col items-center px-5 pb-10 pt-3">
      <div className="mp-hd text-center">
        <div className="mp-eyebrow">Reglas de la casa</div>
        <h2 className="mp-h1">Tres <em>caprichos</em><br />al mes</h2>
        <div className="mp-month">{monthLabel}</div>
      </div>

      <div className="mp-counter">
        <span className="mp-counter-label">Os quedan</span>
        <span className="mp-counter-plates">
          {passes.map((p) => <Plate key={p.idx} filled={!p.redeemed} />)}
        </span>
        <span className="mp-counter-num"><b>{remaining}</b>/3</span>
      </div>

      {loading ? (
        <p className="mt-6 text-[13px] text-ink-muted">Cargando pases…</p>
      ) : (
        <div className="mp-stack">
          {passes.map((p) => (
            <MealPassTicket
              key={p.id}
              pass={p}
              stageBg={STAGE_BG}
              onRedeem={redeem}
              onPlace={setPlace}
            />
          ))}
        </div>
      )}

      {!loading && remaining === 0 && (
        <div className="mp-empty">
          <p>Se acabaron los pases 🍴</p>
          <span>Nos vemos en {nextMonth} — toca cocinar en casa.</span>
        </div>
      )}
    </section>
  );
}
