'use client';

import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { ScreenshotDropZone } from './ScreenshotDropZone';

export interface RecipeExtractInput {
  url?: string;
  caption_text?: string;
  image_base64?: string;
  media_type?: 'image/png' | 'image/jpeg' | 'image/webp';
}

interface RecipeCaptureFormProps {
  onExtract: (input: RecipeExtractInput) => Promise<void>;
  busy?: boolean;
}

function dataUrlToB64(dataUrl: string): { data: string; mediaType: string } | null {
  const m = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { data: m[3], mediaType: m[1] };
}

export function RecipeCaptureForm({ onExtract, busy }: RecipeCaptureFormProps) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  async function submit() {
    const input: RecipeExtractInput = {
      url: url.trim() || undefined,
      caption_text: caption.trim() || undefined,
    };
    if (dataUrl) {
      const parsed = dataUrlToB64(dataUrl);
      if (parsed) {
        input.image_base64 = parsed.data;
        input.media_type = parsed.mediaType as RecipeExtractInput['media_type'];
      }
    }
    await onExtract(input);
  }

  return (
    <section className="flex flex-col gap-4 px-5">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Link</label>
        <div className="mt-1 flex items-center gap-2 border-b border-ink-soft py-2">
          <Link2 size={18} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="tiktok.com/@user/video/..."
            aria-label="Link a la receta"
            inputMode="url"
            className="flex-1 bg-transparent text-[14px] outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Captura (opcional)
        </label>
        <div className="mt-2">
          <ScreenshotDropZone onChange={(_, url) => setDataUrl(url)} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Descripción / ingredientes (opcional)
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={'INGREDIENTES:\n- 200 g pasta\n- 2 tomates\n...'}
          rows={5}
          aria-label="Descripción"
          className="mt-1 w-full rounded-action border border-ink-soft bg-white px-3 py-2 text-[14px] outline-none focus:border-ink"
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={busy || (!url && !dataUrl && !caption)}
        className="mt-2 w-full rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-40"
      >
        {busy ? 'Analizando…' : 'Extraer receta'}
      </button>
    </section>
  );
}
