'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ReceiptCapture, type ReceiptCaptureResult } from '@/components/expenses/ReceiptCapture';
import { OcrPreview } from '@/components/expenses/OcrPreview';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';

export default function ScanExpensePage() {
  const [result, setResult] = useState<ReceiptCaptureResult | null>(null);

  return (
    <main className="flex flex-col gap-5 px-5 pt-4">
      <header className="flex items-center gap-3">
        <Link
          href="/expenses"
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-2xl font-extrabold tracking-tightest text-ink">
          Escanear factura
        </h1>
      </header>

      <InlineSaveText />

      {result ? (
        <OcrPreview
          receipt={result.receipt}
          fileDataUrl={result.fileDataUrl}
          mediaType={result.mediaType}
        />
      ) : (
        <ReceiptCapture onResult={setResult} />
      )}
    </main>
  );
}
