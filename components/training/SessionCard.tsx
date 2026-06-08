'use client';

import { useState } from 'react';
import { Calendar, Check, ChevronRight, PenLine } from 'lucide-react';
import clsx from 'clsx';
import type { Day } from '@/lib/plan-hyrox';
import type { TrainingLog, CustomBlock, ExtraBlock } from '@/lib/hooks/use-training';
import { RC } from '@/lib/training-colors';
import { BlockRow, type BlockData } from './BlockRow';
import { AddBlockRow } from './AddBlockRow';

export interface SessionCardProps {
  day: Day;
  log: TrainingLog | null;
  /** Label like "Lun 8" derived from week + assignedDow. Optional so
   *  callers that don't yet handle scheduling can omit the chip. */
  dayLabel?: string | null;
  /** When true the chip renders with a "solo yo" accent — this athlete
   *  has a personal-only day override apart from the partner. */
  dayIsPersonal?: boolean;
  onPickDay?: () => void;
  onCheck: () => void;
  onUncheck: () => void;
  onOpenRpe: () => void;
  onSaveBlock: (index: number, block: BlockData) => void;
  onDeleteBaseBlock?: (index: number) => void;
  onAddExtra: (block: BlockData) => void;
  onSaveExtra: (index: number, block: BlockData) => void;
  onDeleteExtra: (index: number) => void;
}

const DONE_COLOR = '#77d6bd';

export function SessionCard({
  day, log, dayLabel, dayIsPersonal, onPickDay, onCheck, onUncheck, onOpenRpe,
  onSaveBlock, onDeleteBaseBlock, onAddExtra, onSaveExtra, onDeleteExtra,
}: SessionCardProps) {
  const [open, setOpen] = useState(false);
  const completed = !!log?.completed;
  const rpe = log?.rpe ?? null;
  const customBlocks: Record<number, CustomBlock> = log?.customBlocks ?? {};
  const extras: ExtraBlock[] = log?.extraBlocks ?? [];
  const deletedSet = new Set<number>(log?.deletedBlocks ?? []);
  const visibleCount = day.blocks.reduce((n, _, i) => n + (deletedSet.has(i) ? 0 : 1), 0);
  const blocksCount = visibleCount + extras.length;

  return (
    <article
      data-testid="session-card"
      className={clsx(
        'rounded-card bg-white shadow-card transition-colors',
        completed ? 'border-[1.5px]' : 'border border-transparent'
      )}
      style={completed ? { borderColor: DONE_COLOR } : undefined}
    >
      <header className="flex items-center gap-3 p-4">
        <button
          type="button"
          aria-label={completed ? `Quitar completada ${day.key}` : `Marcar completada ${day.key}`}
          onClick={completed ? onUncheck : onCheck}
          className={clsx(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-transform duration-150 active:scale-95',
            completed ? 'bg-[#77d6bd]/15' : 'border border-ink-soft bg-white'
          )}
        >
          {completed ? (
            <Check size={18} strokeWidth={1.5} style={{ color: DONE_COLOR }} aria-hidden />
          ) : (
            <Check size={14} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
          )}
        </button>

        <button
          type="button"
          aria-label={`Toggle ${day.key}`}
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 min-w-0 items-center gap-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex h-5 items-center rounded-full bg-ink px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-white">
                {day.key}
              </span>
              {dayLabel && onPickDay && (
                <button
                  type="button"
                  aria-label={`Mover ${day.key} a otro día (ahora ${dayLabel}${dayIsPersonal ? ', solo tú' : ''})`}
                  onClick={(e) => { e.stopPropagation(); onPickDay(); }}
                  className={`inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-bold active:scale-95 ${
                    dayIsPersonal
                      ? 'border border-ink bg-ink text-white'
                      : 'border border-ink-soft bg-white text-ink'
                  }`}
                >
                  <Calendar size={10} strokeWidth={1.75} aria-hidden />
                  {dayLabel}
                  {dayIsPersonal && <span aria-hidden>·yo</span>}
                </button>
              )}
              {completed && (
                <span
                  className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold"
                  style={{ background: `${DONE_COLOR}26`, color: '#0f6f5e' }}
                >
                  Completada
                </span>
              )}
              {rpe != null && (
                <span
                  className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold"
                  style={{ background: `${RC[rpe]}26`, color: RC[rpe] }}
                >
                  RPE {rpe}
                </span>
              )}
            </div>
            <p className="mt-1 truncate font-sans text-[16px] font-extrabold leading-tight tracking-tightest text-ink">
              {day.title}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              RPE esperado: {day.rpe} <span aria-hidden>·</span> {blocksCount} bloques
            </p>
          </div>
          <ChevronRight
            size={20}
            strokeWidth={1.5}
            aria-hidden
            className={clsx(
              'flex-shrink-0 text-ink-muted transition-transform duration-200',
              open ? 'rotate-90' : ''
            )}
          />
        </button>
      </header>

      {open && (
        <div className="border-t border-ink-soft px-4 pt-3 pb-4">
          <div className="flex flex-col gap-2">
            {day.blocks.map((b, i) => {
              if (deletedSet.has(i)) return null;
              const cb = customBlocks[i] ?? {};
              const merged: BlockData = {
                name: cb.name ?? b.name,
                sets: cb.sets ?? b.sets,
                load: cb.load ?? b.load,
                rest: cb.rest ?? b.rest,
              };
              return (
                <BlockRow
                  key={`b-${i}`}
                  block={merged}
                  onSave={(next) => onSaveBlock(i, next)}
                  onDelete={onDeleteBaseBlock ? () => onDeleteBaseBlock(i) : undefined}
                />
              );
            })}
            {extras.map((e, i) => (
              <BlockRow
                key={`x-${i}`}
                block={e}
                extra
                onSave={(next) => onSaveExtra(i, next)}
                onDelete={() => onDeleteExtra(i)}
              />
            ))}
            <AddBlockRow onAdd={onAddExtra} />
          </div>

          {completed && (
            <div
              className="mt-4 rounded-item p-3"
              style={{ background: `${DONE_COLOR}14` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Registro
                </p>
                <button
                  type="button"
                  aria-label="Editar registro"
                  onClick={onOpenRpe}
                  className="flex items-center gap-1 rounded-md border border-ink-soft px-2 py-1 text-[11px] font-semibold text-ink-muted transition-transform duration-150 active:scale-95"
                >
                  <PenLine size={12} strokeWidth={1.5} aria-hidden />
                  Editar
                </button>
              </div>
              {log?.notes && (
                <p className="mt-1.5 text-[12px] leading-[1.4] text-ink">{log.notes}</p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
