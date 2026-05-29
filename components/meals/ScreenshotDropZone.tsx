'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';

interface ScreenshotDropZoneProps {
  onChange: (file: File | null, dataUrl: string | null) => void;
}

export function ScreenshotDropZone({ onChange }: ScreenshotDropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  async function handleFile(f: File | null) {
    setError(null);
    if (!f) { setPreview(null); onChange(null, null); return; }
    const MAX = 5 * 1024 * 1024;
    if (f.size > MAX) {
      setError(`La imagen supera los 5 MB (${(f.size / 1024 / 1024).toFixed(1)} MB).`);
      onChange(null, null);
      return;
    }
    if (!f.type.startsWith('image/')) {
      setError('Sólo se aceptan imágenes.');
      onChange(null, null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      setPreview(url);
      onChange(f, url);
    };
    reader.readAsDataURL(f);
  }

  if (preview) {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Captura subida" className="w-full rounded-card object-cover" />
        <button
          type="button"
          onClick={() => handleFile(null)}
          aria-label="Quitar captura"
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action"
        >
          <X size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex w-full flex-col items-center gap-2 rounded-card border border-dashed border-ink-soft bg-white/40 p-6 text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
      aria-label="Subir captura"
    >
      {error && <p className="text-[12px] text-danger">{error}</p>}
      <ImageIcon size={32} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
      <p className="text-[14px] font-medium text-ink">Toca o arrastra una captura</p>
      <p className="text-[12px] text-ink-muted">Opcional</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </button>
  );
}
