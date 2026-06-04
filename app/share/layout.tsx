import Link from 'next/link';

// Public-facing /share/* layout. Deliberately bypasses the (app) group so
// neither MoodGate nor BottomNav render — these pages should look like a
// normal public page to whoever opens the link, not like the in-app shell.
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#faf7f1] text-ink">
      <header className="sticky top-0 z-20 border-b border-ink-soft/40 bg-[#faf7f1]/85 backdrop-blur supports-[backdrop-filter]:bg-[#faf7f1]/65">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-sans text-[14px] font-extrabold tracking-tightest text-ink"
          >
            <span>mkxa</span>
            <span aria-hidden className="text-ink-muted">·</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              compartido
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-5 py-6">{children}</main>

      <footer className="mx-auto w-full max-w-md px-5 pb-8 pt-4 text-center text-[11px] text-ink-muted">
        Compartido desde mkxa
      </footer>
    </div>
  );
}
