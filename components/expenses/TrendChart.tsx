'use client';

import { useMemo } from 'react';
import type { MonthBucket } from '@/lib/hooks/use-expenses-stats';

export interface TrendChartProps {
  data: MonthBucket[];
  /** Pixel height of the chart. Width is responsive via viewBox. */
  height?: number;
  /** Stroke / fill colour. */
  color?: string;
}

/**
 * Minimal SVG line + soft area chart over the last 6 months.
 * No external charting lib. Responsive via viewBox.
 * Current month (last bucket) is highlighted with a filled dot.
 */
export function TrendChart({ data, height = 120, color = '#1b1d1f' }: TrendChartProps) {
  const W = 600;
  const H = height;
  const padX = 24;
  const padY = 18;

  const { path, area, points, maxV, gridY } = useMemo(() => {
    const totals = data.map((d) => d.total);
    const maxV = Math.max(1, ...totals);
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;

    const xs = data.map((_, i) =>
      data.length === 1 ? W / 2 : padX + (i * innerW) / (data.length - 1),
    );
    const ys = totals.map((v) => padY + innerH - (v / maxV) * innerH);

    const points = data.map((d, i) => ({
      x: xs[i],
      y: ys[i],
      bucket: d,
    }));

    const path = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const area =
      points.length > 0
        ? `${path} L ${points[points.length - 1].x.toFixed(1)} ${(padY + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`
        : '';

    // Two soft gridlines for visual context (no axes/labels).
    const gridY = [padY + innerH * 0.33, padY + innerH * 0.66];

    return { path, area, points, maxV, gridY };
  }, [data, H, padX, padY]);

  const eur = (v: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-[140px] w-full"
        role="img"
        aria-label="Tendencia de gastos en los últimos 6 meses"
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridY.map((y, i) => (
          <line
            key={i}
            x1={padX}
            x2={W - padX}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="2 4"
          />
        ))}

        {area && <path d={area} fill="url(#trend-fill)" />}
        {path && (
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((p, i) => {
          const isCurrent = i === points.length - 1;
          return (
            <g key={p.bucket.key}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isCurrent ? 5 : 3}
                fill={isCurrent ? color : '#ffffff'}
                stroke={color}
                strokeWidth={isCurrent ? 0 : 2}
              />
              {isCurrent && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={9}
                  fill={color}
                  fillOpacity="0.12"
                />
              )}
            </g>
          );
        })}
      </svg>

      <div
        className="mt-1 grid text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0,1fr))` }}
      >
        {data.map((d, i) => {
          const isCurrent = i === data.length - 1;
          return (
            <div
              key={d.key}
              className="flex flex-col items-center gap-0.5"
              aria-hidden
            >
              <span className={isCurrent ? 'text-ink' : ''}>{d.label}</span>
              <span className="font-medium normal-case tracking-normal tabular-nums">
                {d.total > 0 ? eur(d.total) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <span className="sr-only">Máximo del rango: {eur(maxV)}.</span>
    </div>
  );
}
