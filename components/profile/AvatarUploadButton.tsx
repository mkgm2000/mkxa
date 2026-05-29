'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Camera, Pencil } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { Athlete } from '@/lib/athlete-context';

interface AvatarUploadButtonProps {
  athlete: Athlete;
  currentUrl: string | null;
  variant: 'overlay' | 'inline';
  onUploaded: (newUrl: string) => void;
  className?: string;
}

const MAX_BYTES = 2 * 1024 * 1024;

async function cropToJpegBlob(file: File, size = 256, quality = 0.85): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read error'));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('image load error'));
    i.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas ctx');
  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = Math.max(0, Math.round((img.naturalWidth - minSide) / 2));
  const sy = Math.max(0, Math.round((img.naturalHeight - minSide) / 2));
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob null'))),
      'image/jpeg',
      quality,
    ),
  );
}

export function AvatarUploadButton({
  athlete, currentUrl, variant, onUploaded, className,
}: AvatarUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handle(file: File | null) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('La imagen supera los 2 MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan archivos de imagen.');
      return;
    }
    setUploading(true);
    saveState.getState().set('saving');
    try {
      const blob = await cropToJpegBlob(file);
      const supa = supabaseClient();
      const path = `${athlete}.jpg`;
      const { error: upErr } = await supa.storage.from('avatars').upload(path, blob, {
        upsert: true,
        cacheControl: '0',
        contentType: 'image/jpeg',
      });
      if (upErr) throw upErr;
      const { data: pub } = supa.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supa.from('athlete_profiles').upsert({
        athlete, avatar_url: url,
      }, { onConflict: 'athlete' });
      if (dbErr) throw dbErr;
      saveState.getState().set('saved');
      onUploaded(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo subir';
      setError(msg);
      saveState.getState().set('error', msg);
    } finally {
      setUploading(false);
    }
  }

  const ButtonInner = variant === 'overlay' ? (
    <Camera size={14} strokeWidth={1.5} className="text-white" aria-hidden />
  ) : (
    <span className="flex items-center gap-2">
      <Pencil size={14} strokeWidth={1.5} aria-hidden /> Cambiar foto
    </span>
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        aria-label="Cambiar foto de perfil"
        disabled={uploading}
        className={clsx(
          variant === 'overlay'
            ? 'absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-ink shadow-action'
            : 'flex w-full items-center justify-center gap-2 rounded-action border border-ink-soft py-2 text-[13px] font-medium text-ink',
          className,
        )}
      >
        {ButtonInner}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
      {error && (
        <p className="mt-1 text-[11px] text-danger" role="alert">{error}</p>
      )}
      <span className="hidden" aria-hidden>{currentUrl ?? ''}</span>
    </>
  );
}
