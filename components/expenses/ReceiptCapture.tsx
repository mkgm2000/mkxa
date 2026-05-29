'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Camera } from 'lucide-react';
import type { ReceiptData } from '@/lib/expenses';

export interface ReceiptCaptureResult {
  receipt: ReceiptData;
  fileDataUrl: string;
  mediaType: string;
}

export interface ReceiptCaptureProps {
  onResult: (r: ReceiptCaptureResult) => void;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

async function fileToBase64(file: File): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve({ base64, dataUrl });
    };
    reader.readAsDataURL(file);
  });
}

export function ReceiptCapture({ onResult }: ReceiptCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagen demasiado grande (máx 5 MB).');
      return;
    }
    setLoading(true);
    try {
      const { base64, dataUrl } = await fileToBase64(file);
      const res = await fetch('/api/ocr-receipt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, media_type: file.type }),
      });
      if (!res.ok) throw new Error('OCR failed');
      const receipt = (await res.json()) as ReceiptData;
      onResult({ receipt, fileDataUrl: dataUrl, mediaType: file.type });
    } catch (e) {
      console.error(e);
      setError('No se pudo leer la imagen. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed bg-white/80 p-10 text-center shadow-item transition-colors',
          dragOver ? 'border-ink' : 'border-ink-soft',
        ].join(' ')}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-action">
          <Camera size={24} strokeWidth={1.5} className="text-ink" aria-hidden />
        </span>
        <p className="font-sans text-base font-bold text-ink">
          {loading ? 'Leyendo factura…' : 'Toca para hacer foto'}
        </p>
        <p className="text-xs text-ink-muted">
          O arrastra una imagen aquí (JPG, PNG, WebP · máx 5 MB).
        </p>
        <input
          ref={inputRef}
          aria-label="Subir factura"
          type="file"
          accept={ACCEPTED.join(',')}
          capture="environment"
          onChange={onChange}
          disabled={loading}
          className="sr-only"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-item bg-white px-4 py-2 text-sm text-danger shadow-item">
          {error}
        </p>
      )}

      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 text-sm text-ink-muted"
        >
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-soft border-t-ink" aria-hidden />
          Procesando con OCR…
        </div>
      )}
    </div>
  );
}
