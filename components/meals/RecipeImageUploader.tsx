'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Camera } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';

const BUCKET = 'recipe-images';
const ACCEPT_ATTR = 'image/*,.heic,.heif';
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

export interface RecipeImageUploaderProps {
  onUploaded: (url: string) => void;
  athleteSubdir?: string;
  label?: string;
  /** When true, render as an invisible full-area button. Parent must be `relative`. */
  overlay?: boolean;
}

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

async function toJpegBlob(file: File): Promise<Blob> {
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
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('jpeg encode failed');
  return blob;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: 16 random hex chars.
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
}

export function RecipeImageUploader({
  onUploaded,
  athleteSubdir,
  label = 'Subir imagen',
  overlay = false,
}: RecipeImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      let blob: Blob;
      try {
        blob = await toJpegBlob(file);
      } catch {
        setError(
          'Este navegador no puede leer el formato. Prueba a sacar la foto en JPG.',
        );
        return;
      }
      const subdir = athleteSubdir ?? 'shared';
      const path = `${subdir}/${randomId()}.jpg`;
      const supa = supabaseClient();
      const { error: upErr } = await supa.storage
        .from(BUCKET)
        .upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      if (upErr) {
        setError(`No se pudo subir (${upErr.message}).`);
        return;
      }
      const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) {
        setError('No se pudo obtener la URL pública.');
        return;
      }
      onUploaded(publicUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'desconocido';
      setError(`No se pudo subir (${msg}).`);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  if (overlay) {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          aria-label={label}
          className="absolute inset-0 z-10 flex items-end justify-end p-3"
        >
          <span className="flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-[11px] font-bold text-white shadow-action backdrop-blur-sm">
            <Camera size={12} strokeWidth={1.5} aria-hidden />
            {loading ? 'Subiendo…' : label}
          </span>
        </button>
        <input
          ref={inputRef}
          aria-label={label}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={onChange}
          disabled={loading}
          className="sr-only"
        />
        {error && (
          <p role="alert" className="absolute inset-x-2 bottom-12 z-10 rounded bg-danger/90 px-2 py-1 text-center text-[11px] font-medium text-white">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-action bg-white px-4 py-2 text-[13px] font-bold text-ink shadow-item active:scale-95 disabled:opacity-50"
      >
        <Camera size={14} strokeWidth={1.5} aria-hidden />
        {loading ? 'Subiendo…' : label}
      </button>
      <input
        ref={inputRef}
        aria-label={label}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={onChange}
        disabled={loading}
        className="sr-only"
      />
      {error && (
        <p role="alert" className="text-[11px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
