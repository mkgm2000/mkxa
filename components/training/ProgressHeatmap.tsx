'use client';

import { Check } from 'lucide-react';
import { RC } from '@/lib/training-colors';

interface Cell {
  rpe: number | null;
  completed: boolean;
}

export interface HeatRow {
  week: number;
  D1: Cell | null;
  D2: Cell | null;
  D3: Cell | null;
  D4: Cell | null;
}

const DAYS = ['D1', 'D2', 'D3', 'D4'] as const;
type DayCol = (typeof DAYS)[number];

export interface ProgressHeatmapProps {
  rows: HeatRow[];
}

export function ProgressHeatmap({ rows }: ProgressHeatmapProps) {
  if (rows.length === 0) {
    return (
      <p className="px-5 text-[13px] text-ink-muted">
        Sin datos todavía. Completa una sesión para ver tu progresión.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto px-5">
      <table
        className="border-separate font-sans text-[10px] font-bold"
        style={{ borderSpacing: 2 }}
      >
        <thead>
          <tr>
            <th aria-hidden />
            {rows.map((r) => (
              <th
                key={r.week}
                scope="col"
                className="px-1 text-center text-ink-muted"
              >
                S{r.week}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <tr key={day}>
              <th scope="row" className="pr-2 text-right text-ink-muted">
                {day}
              </th>
              {rows.map((r) => {
                const cell = r[day as DayCol];
                const rpe = cell?.rpe ?? null;
                const completed = !!cell?.completed;
                const color = rpe != null ? RC[rpe] : null;
                const label =
                  rpe != null
                    ? `Semana ${r.week} ${day} RPE ${rpe}`
                    : completed
                    ? `Semana ${r.week} ${day} sin RPE, completada`
                    : `Semana ${r.week} ${day} sin registro`;
                return (
                  <td
                    key={`${r.week}-${day}`}
                    aria-label={label}
                    className="h-7 w-7 border text-center align-middle"
                    style={{
                      borderRadius: 6,
                      background: color ? `${color}26` : 'transparent',
                      borderColor: color ? `${color}55` : 'rgba(27,29,31,0.15)',
                      color: color ?? '#1b1d1f80',
                    }}
                  >
                    {rpe != null ? (
                      rpe
                    ) : completed ? (
                      <Check
                        size={12}
                        strokeWidth={1.5}
                        className="mx-auto text-ink-muted"
                        aria-hidden
                      />
                    ) : (
                      <span aria-hidden>·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
