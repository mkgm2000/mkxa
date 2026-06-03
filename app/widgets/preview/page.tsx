// Visual preview of the iOS widget tile rendered by /api/widget/next-session.
// Two-up render in iOS widget-sized rounded containers so you can see the
// tile in context before pasting the script into Scriptable.

const TILES = [
  { size: 'small',  w: 170, h: 170, label: 'Small  ·  170×170' },
  { size: 'medium', w: 364, h: 170, label: 'Medium ·  364×170' },
];

export default function WidgetsPreviewPage() {
  // Cache-buster so edits to the route show immediately.
  const cb = Date.now();
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '48px 16px',
        background: 'radial-gradient(120% 100% at 50% 0%, #f6f1ea 0%, #e7e0d0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        fontFamily: 'var(--font-mona), -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.6, color: '#777', textTransform: 'uppercase' }}>
          Widget preview
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1b1d1f', margin: '4px 0 0' }}>
          Próxima sesión
        </h1>
        <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
          Tile renderizada por <code>/api/widget/next-session</code> dentro del marco
          iOS. El widget real será exactamente esta imagen.
        </p>
      </div>

      {TILES.map((t) => {
        const src = `/api/widget/next-session?athlete=Xabi&size=${t.size}&_=${cb}`;
        return (
          <div key={t.size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#666', textTransform: 'uppercase' }}>
              {t.label}
            </p>
            {/* iOS widget chrome — rounded 22px corners + soft drop shadow */}
            <div
              style={{
                width: t.w,
                height: t.h,
                borderRadius: 22,
                overflow: 'hidden',
                boxShadow: '0 18px 50px rgba(0,0,0,0.15), 0 6px 16px rgba(0,0,0,0.08)',
                background: '#fff',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Widget ${t.size}`}
                width={t.w}
                height={t.h}
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <p style={{ fontSize: 10, color: '#888', fontFamily: 'monospace' }}>{src}</p>
          </div>
        );
      })}

      <details style={{ maxWidth: 460, marginTop: 16, color: '#444', fontSize: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          Script de Scriptable (preview)
        </summary>
        <pre
          style={{
            background: '#1b1d1f',
            color: '#e6e6e6',
            padding: 14,
            borderRadius: 12,
            fontSize: 11,
            lineHeight: 1.5,
            overflowX: 'auto',
            marginTop: 8,
          }}
        >{`// next-session.js — copia esto en Scriptable
const ATHLETE = 'Xabi'
const SIZE = config.widgetFamily === 'systemMedium' ? 'medium' : 'small'
const URL_ENDPOINT = \`https://mkxa.vercel.app/api/widget/next-session?athlete=\${ATHLETE}&size=\${SIZE}\`

const widget = new ListWidget()
const img = await new Request(URL_ENDPOINT).loadImage()
widget.backgroundImage = img
widget.url = 'https://mkxa.vercel.app/training'
Script.setWidget(widget)
Script.complete()
`}</pre>
      </details>
    </main>
  );
}
