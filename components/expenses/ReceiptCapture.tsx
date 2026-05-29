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

// Accept anything image-like at the browser. We re-encode to JPEG before upload.
// Includes HEIC/HEIF (iPhone default) which Safari iOS can decode into <img>.
const ACCEPT_ATTR = 'image/*,.heic,.heif';
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

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

export function ReceiptCapture({ onResult }: ReceiptCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
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
    setLoading(true);
    try {
      let payload: { base64: string; dataUrl: string };
      try {
        payload = await toJpeg(file);
      } catch {
        setError(
          'Este navegador no puede leer el formato (¿HEIC en Android?). Prueba a sacar la foto en JPG o convierte la imagen.',
        );
        return;
      }
      const res = await fetch('/api/ocr-receipt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_base64: payload.base64, media_type: 'image/jpeg' }),
      });
      if (res.status === 422) {
        const body = (await res.json().catch(() => ({}))) as { reason?: string };
        setError(
          `No se aprecia bien la factura${body.reason ? ` (${body.reason})` : ''}. Sácala con más luz, enfocada y completa.`,
        );
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `OCR ${res.status}`);
      }
      const receipt = (await res.json()) as ReceiptData;
      onResult({ receipt, fileDataUrl: payload.dataUrl, mediaType: 'image/jpeg' });
    } catch (e) {
      console.error('[ReceiptCapture]', e);
      const msg = e instanceof Error ? e.message : 'desconocido';
      setError(`No se pudo leer la imagen (${msg}). Inténtalo de nuevo.`);
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
          {loading ? 'Leyendo factura…' : 'Toca para hacer foto o elegir de galería'}
        </p>
        <p className="text-xs text-ink-muted">
          O arrastra una imagen aquí (JPG, PNG, HEIC, WebP).
        </p>
        <input
          ref={inputRef}
          aria-label="Subir factura"
          type="file"
          accept={ACCEPT_ATTR}
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
