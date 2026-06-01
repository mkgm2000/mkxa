'use client';

import { useCallback, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { MealPass, MealPassKind, MealPassTheme } from '@/lib/meals/meal-passes';
import { formatRedeemDate } from '@/lib/meals/meal-passes';

interface MealPassTicketProps {
  pass: MealPass;
  theme: MealPassTheme;
  /** Background colour for the perforation notches (matches the parent's gradient
   *  midtone so they appear "cut" out of the ticket). */
  stageBg: string;
  onRedeem: (idx: number) => void;
  onPlace: (idx: number, place: string) => void;
  onKind: (idx: number, kind: MealPassKind) => void;
}

function jaggedMask(side: 'left' | 'right', teeth: number, seed: number): string {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const amp = 2.6;
  const pts: [number, number][] = [];
  if (side === 'right') {
    pts.push([0, 0]);
    for (let k = 0; k <= teeth; k++) {
      const y = (k / teeth) * 100 + (rnd() - 0.5) * 1.4;
      const x = 100 - (k % 2 === 0 ? 0 : amp) - rnd() * 1.2;
      pts.push([x, Math.max(0, Math.min(100, y))]);
    }
    pts.push([0, 100]);
  } else {
    pts.push([100, 0]);
    for (let k = 0; k <= teeth; k++) {
      const y = (k / teeth) * 100 + (rnd() - 0.5) * 1.4;
      const x = (k % 2 === 0 ? 0 : amp) + rnd() * 1.2;
      pts.push([x, Math.max(0, Math.min(100, y))]);
    }
    pts.push([100, 100]);
  }
  const poly = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><polygon points='${poly}' fill='%23fff'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** The app's signature 3D smiley blob, inlined per the redesign spec
 *  (do NOT swap for `MoodBlob.tsx`). */
function Blob({
  c1, c2, dark, mood, used,
}: { c1: string; c2: string; dark: string; mood: MealPassTheme['mood']; used: boolean }) {
  return (
    <div
      className={`mp-blob${used ? ' is-used' : ''}`}
      style={{ background: `radial-gradient(circle at 32% 28%, ${c1}, ${c2} 78%)` }}
    >
      <div className="mp-blob-eyes"><i /><i /></div>
      <div
        className={`mp-blob-mouth ${used ? 'smile' : mood}`}
        style={{ borderColor: dark, color: dark }}
      />
      <span className="mp-blob-cheek l" style={{ background: dark }} />
      <span className="mp-blob-cheek r" style={{ background: dark }} />
    </div>
  );
}

const CONFETTI_COLORS = ['#F4B740', '#FF5C8A', '#5FD3B4', '#9B7BF0'];

export function MealPassTicket({ pass, theme, stageBg, onRedeem, onPlace, onKind }: MealPassTicketProps) {
  const torn = pass.redeemed;
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; moved: number } | null>(null);
  const threshold = 64;
  const seed = useMemo(() => (pass.idx + 1) * 54321 + 7, [pass.idx]);
  const masks = useMemo(
    () => ({ body: jaggedMask('right', 30, seed), stub: jaggedMask('left', 30, seed) }),
    [seed],
  );

  const commit = useCallback(() => {
    setDx(0);
    onRedeem(pass.idx);
  }, [pass.idx, onRedeem]);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (torn) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    drag.current = { x: e.clientX, moved: 0 };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || torn) return;
    const d = Math.max(0, Math.min(e.clientX - drag.current.x, 175));
    drag.current.moved = d;
    setDx(d);
  };
  const onUp = () => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (moved > threshold || moved < 6) commit();
    else setDx(0);
  };

  const dragging = dx > 0;
  const stubStyle: CSSProperties = {
    transform: torn ? 'translate(30px, 8px) rotate(3.5deg)' : `translateX(${dx}px) rotate(${dx * 0.035}deg)`,
    transition: dragging ? 'none' : 'transform .55s cubic-bezier(.18,.9,.25,1.1)',
    WebkitMaskImage: torn ? masks.stub : undefined,
    maskImage: torn ? masks.stub : undefined,
    cursor: torn ? 'default' : 'grab',
    background: theme.stub,
    color: theme.stubFg,
  };
  const bodyStyle: CSSProperties = {
    WebkitMaskImage: torn ? masks.body : undefined,
    maskImage: torn ? masks.body : undefined,
  };
  const redeemedDate = pass.redeemed_at ? formatRedeemDate(new Date(pass.redeemed_at)) : '';
  const cssVars = { ['--accent' as string]: theme.accent } as CSSProperties;

  return (
    <div className={`mp ${torn ? 'is-used' : ''}`} style={cssVars}>
      {/* BODY */}
      <div className="mp-body" style={bodyStyle}>
        <Blob c1={theme.b1} c2={theme.b2} dark={theme.blobDark} mood={theme.mood} used={torn} />

        <div className="mp-body-main">
          <div className="mp-kicker">
            Pase <b style={{ color: theme.accent }}>#{String(pass.idx + 1).padStart(2, '0')}</b>
            {torn && redeemedDate && <span className="mp-kicker-date"> · {redeemedDate}</span>}
          </div>
          <div className="mp-title">{torn ? '¡Disfrutado!' : 'Una comida\nfuera de casa'}</div>

          {!torn ? (
            <div className="mp-sub">{pass.note}</div>
          ) : (
            <div className="mp-log">
              <div className="mp-seg" role="group" aria-label="¿Fuisteis o pedisteis?">
                <button
                  type="button"
                  className={`mp-seg-btn${pass.kind === 'dine' ? ' on' : ''}`}
                  onClick={() => onKind(pass.idx, 'dine')}
                >
                  Fuimos
                </button>
                <button
                  type="button"
                  className={`mp-seg-btn${pass.kind === 'delivery' ? ' on' : ''}`}
                  onClick={() => onKind(pass.idx, 'delivery')}
                >
                  A domicilio
                </button>
              </div>
              <input
                className="mp-place"
                type="text"
                value={pass.place ?? ''}
                placeholder={pass.kind === 'delivery' ? 'pedimos a…' : 'comimos en…'}
                onChange={(e) => onPlace(pass.idx, e.target.value)}
              />
            </div>
          )}
        </div>

        {torn && (
          <div className="mp-stamp show" aria-hidden>Canjeado</div>
        )}
      </div>

      {/* STUB */}
      <div
        className="mp-stub"
        style={stubStyle}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={(e) => {
          if (torn) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(); }
        }}
        tabIndex={torn ? -1 : 0}
        role="button"
        aria-label={torn ? 'Pase canjeado' : 'Desliza o pulsa para canjear este pase'}
      >
        {!torn ? (
          <>
            <div className="mp-stub-top">MK<span>♥</span>XA</div>
            <div className="mp-stub-cta">Canjear</div>
            <div className="mp-grip" aria-hidden><i /><i /><i /></div>
          </>
        ) : (
          <>
            <div className="mp-stub-check" aria-hidden>✓</div>
            <div className="mp-stub-used">Usado</div>
          </>
        )}
      </div>

      <div className="mp-perf" aria-hidden />
      <span className="mp-notch mp-notch--t" style={{ background: stageBg }} aria-hidden />
      <span className="mp-notch mp-notch--b" style={{ background: stageBg }} aria-hidden />

      {!torn && (
        <div className="mp-hint" style={{ opacity: dragging ? 0 : 1 }} aria-hidden>desliza →</div>
      )}

      {torn && (
        <div className="mp-confetti" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => {
            const confettiStyle = {
              ['--a' as string]: `${(i / 12) * 360}deg`,
              ['--d' as string]: `${34 + (i % 3) * 16}px`,
              background: CONFETTI_COLORS[i % 4],
              animationDelay: `${(i % 4) * 18}ms`,
            } as CSSProperties;
            return <span key={i} style={confettiStyle} />;
          })}
        </div>
      )}
    </div>
  );
}
