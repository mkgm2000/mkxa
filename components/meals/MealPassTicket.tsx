'use client';

import { useCallback, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { MealPass } from '@/lib/meals/meal-passes';
import { formatRedeemDate } from '@/lib/meals/meal-passes';

interface MealPassTicketProps {
  pass: MealPass;
  stageBg: string;
  onRedeem: (idx: number) => void;
  onPlace: (idx: number, place: string) => void;
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

function Cutlery({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 2v7a2 2 0 0 0 2 2v0M7 2v4M5 2v4M9 2v4M9 11v11M5 11v0" />
      <path d="M17 2c-1.5 0-2.5 2-2.5 5s1 4 2.5 4m0 0v11m0-11c1.5 0 2.5-1 2.5-4s-1-5-2.5-5" />
    </svg>
  );
}

export function MealPassTicket({ pass, stageBg, onRedeem, onPlace }: MealPassTicketProps) {
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
  const stubStyle: React.CSSProperties = {
    transform: torn ? 'translate(34px, 7px) rotate(3deg)' : `translateX(${dx}px) rotate(${dx * 0.035}deg)`,
    transition: dragging ? 'none' : 'transform .55s cubic-bezier(.18,.9,.25,1.1)',
    WebkitMaskImage: torn ? masks.stub : undefined,
    maskImage: torn ? masks.stub : undefined,
    cursor: torn ? 'default' : 'grab',
  };
  const bodyStyle: React.CSSProperties = {
    WebkitMaskImage: torn ? masks.body : undefined,
    maskImage: torn ? masks.body : undefined,
  };
  const redeemedDate = pass.redeemed_at ? formatRedeemDate(new Date(pass.redeemed_at)) : '';

  return (
    <div className={`mp ${torn ? 'is-used' : ''}`}>
      <div className="mp-body" style={bodyStyle}>
        <div className="mp-perfcol" aria-hidden />
        <div className="mp-kicker">
          <Cutlery color="#e0533b" size={15} />
          <span>Pase de comida</span>
          <b>Nº {String(pass.idx + 1).padStart(2, '0')}</b>
        </div>

        <div className="mp-title">Una comida<br />fuera de casa</div>
        <div className="mp-sub">{pass.note}</div>
        <div className="mp-meta"><span>Vale por 1 cena · invita el azar</span></div>

        {torn && (
          <div className="mp-log">
            <label htmlFor={`mp-place-${pass.idx}`}>Comimos en</label>
            <input
              id={`mp-place-${pass.idx}`}
              type="text"
              value={pass.place ?? ''}
              placeholder="añade el restaurante…"
              onChange={(e) => onPlace(pass.idx, e.target.value)}
            />
            <span className="mp-date">{redeemedDate}</span>
          </div>
        )}
      </div>

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
            <div className="mp-stub-top">M&nbsp;<span>♥</span>&nbsp;X</div>
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
    </div>
  );
}
