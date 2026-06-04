import { Suspense } from 'react';
import { RecapClient } from './RecapClient';

export const dynamic = 'force-dynamic';

export default function RecapPage() {
  return (
    <Suspense fallback={<RecapFallback />}>
      <RecapClient />
    </Suspense>
  );
}

function RecapFallback() {
  return (
    <main className="flex h-dvh items-center justify-center bg-black text-white">
      <span className="text-sm opacity-70">Preparando tu resumen…</span>
    </main>
  );
}
