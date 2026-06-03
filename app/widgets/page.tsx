// Public-facing widget hub. MK + Xabi land here to install widgets on
// their iPhone. Each card shows a live preview tile + a one-line
// description + a copy-to-clipboard Scriptable script.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Copy, Check } from 'lucide-react';

interface WidgetDef {
  key: string;
  title: string;
  description: string;
  endpoint: string;
  deepLink: string;
  sizes: ('small' | 'medium')[];
  status: 'ready' | 'comingsoon';
}

const WIDGETS: WidgetDef[] = [
  {
    key: 'next-session',
    title: 'Próxima sesión',
    description: 'Lo que toca hoy: nombre, RPE, duración, ejercicios y racha de la semana.',
    endpoint: '/api/widget/next-session',
    deepLink: '/training',
    sizes: ['small', 'medium'],
    status: 'ready',
  },
  {
    key: 'mood',
    title: 'Mood de hoy',
    description: 'Las dos caritas (MK y Xabi) con el mood del día. Tap → registrar.',
    endpoint: '/api/widget/mood',
    deepLink: '/mood',
    sizes: ['small', 'medium'],
    status: 'comingsoon',
  },
  {
    key: 'expenses',
    title: 'Gastos del mes',
    description: 'Total, categoría top y un mini-desglose.',
    endpoint: '/api/widget/expenses',
    deepLink: '/expenses',
    sizes: ['small', 'medium'],
    status: 'comingsoon',
  },
  {
    key: 'passes',
    title: 'Pases de comida',
    description: 'Cupones restantes del mes con el estilo del ticket.',
    endpoint: '/api/widget/passes',
    deepLink: '/meals?tab=pases',
    sizes: ['small'],
    status: 'comingsoon',
  },
];

function scriptableSrc(w: WidgetDef, baseOrigin: string): string {
  return `// ${w.title} — pega esto en Scriptable
// Tip: para añadirlo a la home, mantén pulsado el widget de Scriptable,
// "Editar widget" y elige este script en el desplegable.

const ATHLETE = 'Xabi' // cambia a 'MK' si eres MK
const SIZE = config.widgetFamily === 'systemMedium' ? 'medium' : 'small'
const ENDPOINT = '${baseOrigin}${w.endpoint}?athlete=' + ATHLETE + '&size=' + SIZE

const widget = new ListWidget()
const img = await new Request(ENDPOINT).loadImage()
widget.backgroundImage = img
widget.url = '${baseOrigin}${w.deepLink}'
Script.setWidget(widget)
Script.complete()
`;
}

export default function WidgetsPage() {
  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://mkxa.vercel.app';
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(120% 100% at 50% 0%, #f6f1ea 0%, #e7e0d0 100%)',
        padding: '24px 16px 80px',
        fontFamily: 'var(--font-mona), -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#1b1d1f',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link
          href="/home"
          aria-label="Volver"
          style={{
            width: 40, height: 40, borderRadius: 999, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </Link>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.6, color: '#777', textTransform: 'uppercase' }}>
            iOS · Scriptable
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: '2px 0 0', letterSpacing: -0.6 }}>
            Widgets de mkxa
          </h1>
        </div>
      </header>

      <details
        style={{
          background: '#fff', padding: '14px 18px', borderRadius: 22,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 28,
          fontSize: 12, color: '#444',
        }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13, color: '#1b1d1f' }}>
          Cómo instalar (1 vez por iPhone)
        </summary>
        <ol style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Instala <b>Scriptable</b> desde la App Store (gratis).</li>
          <li>Ábrela, toca <b>+</b> y pega el script del widget que quieras.</li>
          <li>Cambia <code>ATHLETE</code> a <code>{`'MK'`}</code> o <code>{`'Xabi'`}</code>.</li>
          <li>Toca <b>Done</b> y vuelve a la home de tu iPhone.</li>
          <li>Mantén pulsado en la home → <b>Edit Home</b> → <b>+</b> arriba a la izquierda → busca <b>Scriptable</b> → añade el tamaño que prefieras.</li>
          <li>Mantén pulsado el widget recién añadido → <b>Editar widget</b> → en <i>Script</i> elige el que pegaste.</li>
        </ol>
      </details>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {WIDGETS.map((w) => (
          <WidgetCard key={w.key} w={w} baseOrigin={baseOrigin} />
        ))}
      </div>
    </main>
  );
}

function WidgetCard({ w, baseOrigin }: { w: WidgetDef; baseOrigin: string }) {
  const [copied, setCopied] = useState(false);
  const src = scriptableSrc(w, baseOrigin);

  async function copy() {
    try {
      await navigator.clipboard.writeText(src);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // some browsers block writeText without https — ignore
    }
  }

  return (
    <section
      style={{
        background: '#fff', borderRadius: 26, padding: 20,
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 14,
        opacity: w.status === 'ready' ? 1 : 0.55,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.4, margin: 0 }}>{w.title}</h2>
        {w.status === 'comingsoon' && (
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase',
            background: '#ffd987', color: '#7a5400', padding: '3px 8px', borderRadius: 999,
          }}>Pronto</span>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.5 }}>{w.description}</p>

      {w.status === 'ready' && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {w.sizes.map((s) => {
            const dim = s === 'small' ? 170 : 364;
            return (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#888', textTransform: 'uppercase' }}>
                  {s}
                </span>
                <div
                  style={{
                    width: dim, height: 170, borderRadius: 22, overflow: 'hidden',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
                    background: '#fff',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${w.endpoint}?size=${s}&athlete=Xabi`}
                    alt={`${w.title} ${s}`}
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {w.status === 'ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: '#666', textTransform: 'uppercase' }}>
              Script Scriptable
            </span>
            <button
              type="button"
              onClick={copy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: copied ? '#54c6a6' : '#1b1d1f', color: '#fff',
                border: 'none', borderRadius: 999, padding: '6px 12px',
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <pre style={{
            background: '#1b1d1f', color: '#e6e6e6', padding: 14, borderRadius: 14,
            fontSize: 10.5, lineHeight: 1.5, overflowX: 'auto', margin: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>{src}</pre>
        </div>
      )}
    </section>
  );
}
