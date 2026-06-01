'use client';

import { MealPassTicket } from './MealPassTicket';
import { useMealPasses } from '@/lib/hooks/use-meal-passes';
import { MESES_ES, MEAL_PASS_THEMES } from '@/lib/meals/meal-passes';

/** Mid-stop of the parent `MoodGradientBg` for `mood="happy"`. The ticket
 *  notches paint this colour so they appear to "punch through" to the
 *  background gradient. */
const STAGE_BG = '#fcecc0';

function Plate({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg
      className="plate"
      viewBox="0 0 30 30"
      fill="none"
      aria-hidden
      style={{ transform: filled ? 'scale(1)' : 'scale(0.86)' }}
    >
      <circle
        cx="15"
        cy="15"
        r="12.5"
        stroke={filled ? color : '#dccfae'}
        strokeWidth="2.2"
        fill={filled ? color : 'transparent'}
        fillOpacity={filled ? 0.18 : 0}
      />
      <circle
        cx="15"
        cy="15"
        r="6"
        stroke={filled ? color : '#dccfae'}
        strokeWidth="2"
      />
    </svg>
  );
}

export function MealPassesSection() {
  const { passes, loading, remaining, monthLabel, redeem, setPlace, setKind } = useMealPasses();
  const now = new Date();
  const nextMonth = MESES_ES[(now.getMonth() + 1) % 12];

  return (
    <section className="flex flex-col items-center px-5 pb-10 pt-3">
      <div className="hd">
        <div className="eyebrow">MK ♥ XA · reglas de la casa</div>
        <h1>Pases de comida</h1>
        <div className="month">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
      </div>

      <div className="counter">
        <span className="label">Os quedan</span>
        <span className="plates">
          {passes.map((p) => (
            <Plate
              key={p.idx}
              filled={!p.redeemed}
              color={MEAL_PASS_THEMES[p.idx]?.accent ?? '#E89A1C'}
            />
          ))}
        </span>
        <span className="num"><b>{remaining}</b>/4</span>
      </div>

      {loading ? (
        <p className="mt-6 text-[13px] text-ink-muted">Cargando pases…</p>
      ) : (
        <div className="stack">
          {passes.map((p) => (
            <MealPassTicket
              key={p.id}
              pass={p}
              theme={MEAL_PASS_THEMES[p.idx] ?? MEAL_PASS_THEMES[0]}
              stageBg={STAGE_BG}
              onRedeem={redeem}
              onPlace={setPlace}
              onKind={setKind}
            />
          ))}
        </div>
      )}

      {!loading && remaining === 0 && (
        <div className="empty">
          <p>¡Se acabaron los pases! 🍴</p>
          <span>Nos vemos en {nextMonth} — toca cocinar en casa.</span>
        </div>
      )}
    </section>
  );
}
