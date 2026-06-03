'use client';

import { useState } from 'react';
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
  // Confirmation modal gate — the ticket no longer redeems directly; it
  // requests a redeem and we ask the user to confirm. Stops accidental
  // taps from burning a pass.
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const pendingPass = pendingIdx !== null ? passes.find((p) => p.idx === pendingIdx) ?? null : null;
  const pendingTheme = pendingIdx !== null ? MEAL_PASS_THEMES[pendingIdx] ?? MEAL_PASS_THEMES[0] : null;

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
              onRedeem={(idx) => setPendingIdx(idx)}
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

      {pendingPass && pendingTheme && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar canjeo"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-5"
          onClick={() => setPendingIdx(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-card p-6 text-center shadow-2xl"
            style={{
              background: `radial-gradient(120% 140% at 50% 0%, ${pendingTheme.b1} 0%, ${pendingTheme.b2} 70%, ${pendingTheme.accent} 100%)`,
            }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[28px] shadow-md" aria-hidden>
              🍽️
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
              Pase #{String(pendingPass.idx + 1).padStart(2, '0')}
            </p>
            <h2 className="mt-1 font-sans text-[22px] font-extrabold leading-tight text-white">
              ¿Lo canjeáis ahora?
            </h2>
            <p className="mt-1 text-[12px] text-white/80">
              Una vez canjeado se descuenta del mes. Es reversible solo si pulsáis “Reactivar todos”.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingIdx(null)}
                className="flex-1 rounded-full bg-white/95 py-3 text-[13px] font-bold text-ink active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = pendingPass.idx;
                  setPendingIdx(null);
                  void redeem(idx);
                }}
                className="flex-1 rounded-full bg-ink py-3 text-[13px] font-bold text-white active:scale-[0.98]"
                style={{ backgroundColor: pendingTheme.accent }}
              >
                Sí, canjear
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
