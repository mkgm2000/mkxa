'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CategorySelect } from '@/components/controls/CategorySelect';
import { PaidBySelect } from '@/components/controls/PaidBySelect';
import { ReceiptItemsCard } from '@/components/expenses/ReceiptItemsCard';
import { useCreateExpense } from '@/lib/hooks/use-create-expense';
import { useAthlete } from '@/lib/athlete-context';
import { supabaseClient } from '@/lib/supabase/client';
import { todayISO } from '@/lib/date';
import { CATEGORIES, type Category, type PaidBy, type ReceiptData, type NewExpense } from '@/lib/expenses';

export interface OcrPreviewProps {
  receipt: ReceiptData;
  fileDataUrl: string;
  mediaType: string;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `xxxxxxxxxxxxxxxx`.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function lowConf(conf: number | null): boolean {
  return conf !== null && conf < 0.6;
}

export function OcrPreview({ receipt, fileDataUrl, mediaType }: OcrPreviewProps) {
  const router = useRouter();
  const athlete = useAthlete();
  const { create, saving } = useCreateExpense();
  const [error, setError] = useState<string | null>(null);

  const confidence = receipt.confidence;
  const overallLow = useMemo(() => lowConf(confidence), [confidence]);

  const [amount, setAmount]     = useState(receipt.total != null ? String(receipt.total) : '');
  const [date, setDate]         = useState(receipt.date ?? todayISO());
  const [merchant, setMerchant] = useState(receipt.merchant ?? '');
  const [category, setCategory] = useState<Category>(
    receipt.category_suggested && CATEGORIES.includes(receipt.category_suggested)
      ? receipt.category_suggested
      : 'comida',
  );
  const [paidBy, setPaidBy] = useState<PaidBy>('Compartido');
  const [description, setDescription] = useState('');

  const lowClass = 'border-b-2 border-b-cat-ocio';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!athlete) return;
    setError(null);
    const parsed = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Importe inválido');
      return;
    }

    const id = uuid();
    const ext = EXT_BY_MIME[mediaType] ?? 'jpg';
    const path = `${athlete}/${id}.${ext}`;
    const blob = dataUrlToBlob(fileDataUrl);

    const supabase = supabaseClient();
    const upload = await supabase.storage.from('receipts').upload(path, blob, {
      contentType: mediaType,
      upsert: false,
    });
    if (upload.error) {
      setError('No se pudo subir la imagen.');
      return;
    }

    const { data: signed } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    const payload: NewExpense = {
      amount: parsed,
      currency: 'EUR',
      category,
      date,
      paid_by: paidBy,
      description: description.trim() || null,
      merchant: merchant.trim() || null,
      receipt_url: signed?.signedUrl ?? null,
      receipt_data: receipt,
      created_by: athlete,
    };
    const saved = await create(payload);
    if (saved) router.push('/expenses');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {overallLow && (
        <p className="rounded-item bg-cat-ocio/30 px-4 py-2 text-xs font-medium text-ink">
          Confianza baja en el OCR. Revisa los campos marcados.
        </p>
      )}

      <div className="overflow-hidden rounded-card bg-white shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileDataUrl} alt="Factura escaneada" className="max-h-72 w-full object-contain bg-ink-soft/10" />
      </div>

      <label className="rounded-card bg-white p-4 shadow-card">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Importe</span>
        <div className="mt-1 flex items-baseline gap-2">
          <input
            aria-label="Importe"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className={`w-full bg-transparent font-sans text-[32px] font-extrabold leading-none tracking-tightest text-ink placeholder:text-ink-soft focus:outline-none ${lowConf(confidence) ? lowClass : ''}`}
          />
          <span className="text-lg font-bold text-ink-muted">EUR</span>
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Fecha</span>
          <input
            aria-label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`bg-transparent font-sans text-sm font-medium text-ink focus:outline-none ${lowConf(confidence) ? lowClass : ''}`}
          />
        </label>

        <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Comercio</span>
          <input
            aria-label="Comercio"
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className={`bg-transparent font-sans text-sm font-medium text-ink focus:outline-none ${lowConf(confidence) ? lowClass : ''}`}
          />
        </label>
      </div>

      <div>
        <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Categoría</p>
        <CategorySelect value={category} onChange={setCategory} />
      </div>

      <div>
        <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Pagado por</p>
        <PaidBySelect value={paidBy} onChange={setPaidBy} />
      </div>

      <ReceiptItemsCard receipt={receipt} />

      <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Nota</span>
        <textarea
          aria-label="Nota"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="min-h-[44px] resize-none bg-transparent font-sans text-sm font-medium text-ink focus:outline-none"
          placeholder="Opcional"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-item bg-white px-4 py-2 text-sm text-danger shadow-item">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !athlete}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 font-sans text-sm font-bold text-white shadow-action transition-transform duration-150 active:scale-95 disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar gasto'}
      </button>
    </form>
  );
}
