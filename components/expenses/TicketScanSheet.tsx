'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { Camera, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { useCreateExpense } from '@/lib/hooks/use-create-expense';
import { usePantry } from '@/lib/hooks/use-pantry';
import { useAthlete } from '@/lib/athlete-context';
import { todayISO } from '@/lib/date';
import {
  categoriseTicketItem,
  ticketNameToPantryName,
} from '@/lib/meals/ticket-categorise';
import type { NewExpense } from '@/lib/expenses';

export interface TicketScanSheetProps {
  open: boolean;
  onClose: () => void;
}

interface TicketItem {
  name: string;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
}

interface TicketResponse {
  merchant: string | null;
  total: number | null;
  date: string | null;
  items: TicketItem[];
}

type Step = 'upload' | 'loading' | 'review' | 'saving';

interface ReviewRow {
  id: number;
  checked: boolean;
  name: string;
  line_total: string; // string so the input is controllable
}

const MAX_EDGE_PX = 1500;
const JPEG_QUALITY = 0.8;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

async function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error ?? new Error('read error'));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode error'));
    img.src = src;
  });
}

async function toJpeg(file: File): Promise<{ base64: string; dataUrl: string }> {
  const srcUrl = await readDataUrl(file);
  const img = await loadImage(srcUrl);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas ctx');
  ctx.drawImage(img, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64 = dataUrl.split(',')[1] ?? '';
  if (!base64) throw new Error('jpeg encode failed');
  return { dataUrl, base64 };
}

function parseAmount(s: string): number | null {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function TicketScanSheet({ open, onClose }: TicketScanSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const athlete = useAthlete();
  const { create } = useCreateExpense();
  const { addItem } = usePantry();

  const [step, setStep] = useState<Step>('upload');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketResponse | null>(null);
  const [merchant, setMerchant] = useState('Mercadona');
  const [totalStr, setTotalStr] = useState('');
  const [dateStr, setDateStr] = useState(todayISO());
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Reset everything when the sheet closes so re-opening starts fresh.
  useEffect(() => {
    if (!open) {
      setStep('upload');
      setPreviewDataUrl(null);
      setTicket(null);
      setMerchant('Mercadona');
      setTotalStr('');
      setDateStr(todayISO());
      setRows([]);
      setError(null);
      setProgress(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && step !== 'loading' && step !== 'saving') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, step]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    const looksLikeImage =
      file.type.startsWith('image/') ||
      /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
    if (!looksLikeImage) {
      setError('Formato no soportado. Sube una imagen.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Imagen demasiado grande (máx 25 MB).');
      return;
    }
    setStep('loading');
    try {
      let payload: { base64: string; dataUrl: string };
      try {
        payload = await toJpeg(file);
      } catch {
        setError(
          'Este navegador no puede leer el formato. Prueba a sacar la foto en JPG.',
        );
        setStep('upload');
        return;
      }
      setPreviewDataUrl(payload.dataUrl);

      const res = await fetch('/api/ocr/ticket', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          image_base64: payload.base64,
          media_type: 'image/jpeg',
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `OCR ${res.status}`);
      }
      const data = (await res.json()) as TicketResponse;
      setTicket(data);
      setMerchant(data.merchant?.trim() || 'Mercadona');
      setTotalStr(data.total != null ? String(data.total) : '');
      setDateStr(data.date ?? todayISO());
      setRows(
        data.items.map((it, idx) => ({
          id: idx,
          checked: true,
          name: it.name,
          line_total: it.line_total != null ? String(it.line_total) : '',
        })),
      );
      setStep('review');
    } catch (e) {
      console.error('[TicketScanSheet]', e);
      const msg = e instanceof Error ? e.message : 'desconocido';
      setError(`No se pudo leer el ticket (${msg}). Inténtalo de nuevo.`);
      setStep('upload');
    }
  }, []);

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (file) void handleFile(file);
  }

  function updateRow(id: number, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const checkedCount = useMemo(() => rows.filter((r) => r.checked).length, [rows]);

  async function onConfirm() {
    if (!athlete) {
      setError('Selecciona usuario (MK o Xabi) antes de guardar.');
      return;
    }
    const totalNum = parseAmount(totalStr);
    if (totalNum == null || totalNum <= 0) {
      setError('Importe total inválido.');
      return;
    }
    setError(null);
    setStep('saving');

    // 1) Create the expense row. We reuse the existing schema (category=comida,
    //    merchant=Mercadona by default). receipt_data left null because this
    //    flow skips the storage upload — the legacy /expenses/scan route still
    //    handles full receipt persistence with image storage if needed.
    const expense: NewExpense = {
      amount: totalNum,
      currency: 'EUR',
      category: 'comida',
      date: dateStr || todayISO(),
      paid_by: 'Compartido',
      description: null,
      merchant: merchant.trim() || 'Mercadona',
      receipt_url: null,
      receipt_data: null,
      created_by: athlete,
    };

    const saved = await create(expense);
    if (!saved) {
      setError('No se pudo guardar el gasto.');
      setStep('review');
      return;
    }

    // 2) Insert each checked item into the pantry. Sequential keeps progress
    //    accurate and avoids hammering Supabase.
    const toAdd = rows.filter((r) => r.checked && r.name.trim());
    setProgress({ current: 0, total: toAdd.length });
    for (let i = 0; i < toAdd.length; i++) {
      const row = toAdd[i];
      const name = ticketNameToPantryName(row.name);
      const aisle = categoriseTicketItem(row.name);
      try {
        await addItem({ name, aisle });
      } catch (e) {
        console.error('[TicketScanSheet] addItem', name, e);
      }
      setProgress({ current: i + 1, total: toAdd.length });
    }

    onClose();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escanear ticket"
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => {
          if (step !== 'loading' && step !== 'saving') onClose();
        }}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <div className="relative flex h-[90vh] w-full max-w-md flex-col rounded-t-sheet bg-white shadow-card">
        <div className="flex items-start justify-between px-5 pt-5">
          <h2 className="font-sans text-2xl font-extrabold tracking-tightest text-ink">
            Escanear ticket
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => {
              if (step !== 'loading' && step !== 'saving') onClose();
            }}
            disabled={step === 'loading' || step === 'saving'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action disabled:opacity-40"
          >
            <X size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom,16px),24px)] pt-4">
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-item bg-white px-4 py-2 text-sm text-danger shadow-item"
            >
              {error}
            </p>
          )}

          {step === 'upload' && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-ink-soft bg-white/80 p-10 text-center shadow-item"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-action">
                  <Camera size={24} strokeWidth={1.5} className="text-ink" aria-hidden />
                </span>
                <span className="font-sans text-base font-bold text-ink">
                  Toca para hacer foto del ticket
                </span>
                <span className="text-xs text-ink-muted">
                  Mercadona, Lidl, etc. Se subirá a despensa y se anotará el gasto.
                </span>
              </button>
              <input
                ref={inputRef}
                aria-label="Subir ticket"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPickFile}
                className="sr-only"
              />
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-12">
              {previewDataUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewDataUrl}
                  alt="Ticket"
                  className="max-h-64 w-full rounded-card object-contain bg-ink-soft/10 shadow-item"
                />
              )}
              <div className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Analizando ticket…
              </div>
            </div>
          )}

          {step === 'review' && ticket && (
            <div className="flex flex-col gap-4">
              {previewDataUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewDataUrl}
                  alt="Ticket"
                  className="max-h-40 w-full rounded-card object-contain bg-ink-soft/10 shadow-item"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Total
                  </span>
                  <input
                    aria-label="Total"
                    type="text"
                    inputMode="decimal"
                    value={totalStr}
                    onChange={(e) => setTotalStr(e.target.value)}
                    placeholder="0,00"
                    className="bg-transparent font-sans text-lg font-bold tabular-nums text-ink focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Fecha
                  </span>
                  <input
                    aria-label="Fecha"
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="bg-transparent font-sans text-sm font-medium text-ink focus:outline-none"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Comercio
                </span>
                <input
                  aria-label="Comercio"
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="bg-transparent font-sans text-sm font-medium text-ink focus:outline-none"
                />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Productos detectados ({checkedCount}/{rows.length})
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setRows((prev) => {
                        const allChecked = prev.every((r) => r.checked);
                        return prev.map((r) => ({ ...r, checked: !allChecked }));
                      })
                    }
                    className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted underline"
                  >
                    Alternar todos
                  </button>
                </div>
                <ul className="flex flex-col gap-2">
                  {rows.length === 0 && (
                    <li className="rounded-item bg-white px-4 py-3 text-sm text-ink-muted shadow-item">
                      No se han detectado productos.
                    </li>
                  )}
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center gap-2 rounded-item bg-white px-3 py-2 shadow-item"
                    >
                      <input
                        type="checkbox"
                        aria-label={`Incluir ${row.name}`}
                        checked={row.checked}
                        onChange={(e) =>
                          updateRow(row.id, { checked: e.target.checked })
                        }
                        className="h-5 w-5 accent-ink"
                      />
                      <input
                        type="text"
                        aria-label="Nombre"
                        value={row.name}
                        onChange={(e) => updateRow(row.id, { name: e.target.value })}
                        className="flex-1 bg-transparent font-sans text-sm font-medium text-ink focus:outline-none"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Importe"
                        value={row.line_total}
                        onChange={(e) =>
                          updateRow(row.id, { line_total: e.target.value })
                        }
                        placeholder="0,00"
                        className="w-16 bg-transparent text-right font-sans text-sm font-bold tabular-nums text-ink focus:outline-none"
                      />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('upload');
                    setTicket(null);
                    setPreviewDataUrl(null);
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 font-sans text-sm font-bold text-ink shadow-action active:scale-95"
                >
                  <RotateCcw size={16} aria-hidden /> Otra foto
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={!athlete}
                  className="ml-auto inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 font-sans text-sm font-bold text-white shadow-action active:scale-95 disabled:opacity-50"
                >
                  <Check size={16} aria-hidden /> Confirmar
                </button>
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 size={32} className="animate-spin text-ink" aria-hidden />
              <p className="font-sans text-base font-bold text-ink">
                Guardando gasto…
              </p>
              {progress && (
                <p className="text-sm text-ink-muted">
                  Añadiendo {progress.current} de {progress.total} a despensa…
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
