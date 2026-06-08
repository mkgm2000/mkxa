'use client';

import { useEffect, useRef, useState } from 'react';
import { PenLine, Trash2 } from 'lucide-react';
import { getRest } from '@/lib/training-rest';

export interface BlockData {
  name: string;
  sets: string;
  load: string;
}

export interface BlockRowProps {
  block: BlockData;
  /** When true, dot uses muted colour (extras). */
  extra?: boolean;
  onSave: (next: BlockData) => void;
  onDelete?: () => void;
}

// Long-press threshold (ms). Above 500 to avoid accidental triggers; below
// 800 to feel responsive.
const LONG_PRESS_MS = 600;

export function BlockRow({ block, extra, onSave, onDelete }: BlockRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(block.name);
  const [sets, setSets] = useState(block.sets);
  const [load, setLoad] = useState(block.load);
  const [confirming, setConfirming] = useState(false);
  const [pressing, setPressing] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const startPress = () => {
    if (!onDelete) return;
    longPressFired.current = false;
    setPressing(true);
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setPressing(false);
      setConfirming(true);
      // Haptic on supported devices.
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    setPressing(false);
    if (pressTimer.current != null) { window.clearTimeout(pressTimer.current); pressTimer.current = null; }
  };
  useEffect(() => () => cancelPress(), []);

  const rest = getRest(block.name, block.sets);
  const loadLine = [block.load, rest && rest !== '—' ? `Descanso: ${rest}` : null]
    .filter(Boolean)
    .join(' · ');

  if (editing) {
    return (
      <div className="rounded-item bg-white p-3 shadow-item">
        <label className="block">
          <span className="sr-only">Ejercicio</span>
          <input
            aria-label="Ejercicio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ejercicio"
            className="w-full rounded-md border border-ink-soft bg-white px-2.5 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
          />
        </label>
        <div className="mt-2 flex gap-2">
          <label className="block w-24 flex-shrink-0">
            <span className="sr-only">Series</span>
            <input
              aria-label="Series"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder="Series"
              className="w-full rounded-md border border-ink-soft bg-white px-2.5 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
            />
          </label>
          <label className="block flex-1">
            <span className="sr-only">Carga</span>
            <input
              aria-label="Carga"
              value={load}
              onChange={(e) => setLoad(e.target.value)}
              placeholder="Carga"
              className="w-full rounded-md border border-ink-soft bg-white px-2.5 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
            />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={() => { setEditing(false); onDelete(); }}
              className="flex-1 rounded-md border border-danger/40 px-3 py-2 text-[12px] font-semibold text-danger transition-transform duration-150 active:scale-95"
            >
              Eliminar
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(block.name); setSets(block.sets); setLoad(block.load);
            }}
            className="flex-1 rounded-md border border-ink-soft px-3 py-2 text-[12px] font-semibold text-ink-muted transition-transform duration-150 active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              onSave({ name: name.trim(), sets: sets.trim(), load: load.trim() });
            }}
            className="flex-1 rounded-md border border-ink bg-ink px-3 py-2 text-[12px] font-semibold text-white transition-transform duration-150 active:scale-95"
          >
            Guardar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Editar ${block.name}`}
        onClick={() => { if (!longPressFired.current) setEditing(true); }}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onTouchMove={cancelPress}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        className={`group flex w-full items-start gap-3 rounded-item bg-white p-3 text-left shadow-item transition-all duration-150 active:scale-[0.99] ${
          pressing ? 'scale-[0.97] bg-danger/5' : ''
        }`}
      >
        <span
          aria-hidden
          className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${extra ? 'bg-ink-muted' : 'bg-ink'}`}
        />
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[14px] font-semibold text-ink">{block.name}</span>
            {block.sets && (
              <span className="flex-shrink-0 text-[12px] font-medium text-ink-muted">
                {block.sets}
              </span>
            )}
          </span>
          {loadLine && (
            <span className="mt-0.5 block text-[11px] text-ink-muted">{loadLine}</span>
          )}
        </span>
        <PenLine size={14} strokeWidth={1.5} className="mt-1 flex-shrink-0 text-ink-muted opacity-0 group-hover:opacity-100" aria-hidden />
      </button>

      {confirming && onDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/35"
          onClick={() => setConfirming(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full rounded-t-sheet bg-white p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
                <Trash2 size={18} strokeWidth={1.75} className="text-danger" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Eliminar bloque
                </p>
                <p className="mt-1 font-sans text-[18px] font-extrabold leading-tight tracking-tightest text-ink">
                  {block.name}
                </p>
                <p className="mt-1 text-[12px] text-ink-muted">
                  Se quita de la sesión. Si era del plan base, puedes recuperarlo regenerando la semana.
                </p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-action border border-ink-soft px-4 py-3 text-[13px] font-semibold text-ink-muted active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setConfirming(false); onDelete(); }}
                className="flex-1 rounded-action bg-danger px-4 py-3 text-[13px] font-extrabold text-white active:scale-95"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
