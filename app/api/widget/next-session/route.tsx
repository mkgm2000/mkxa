// PNG tile for the "Próxima sesión" iOS widget. Uses Mona Sans (the
// app's own typeface) and the mkxa "chubby" rounded-card aesthetic so
// the widget feels like a slice of the app on the home screen.

import { ImageResponse } from 'next/og';
import { getCurrentWeek, getDays, type Day } from '@/lib/plan-hyrox';
import type { Athlete } from '@/lib/athlete-context';

export const runtime = 'edge';

// Pulls the next not-yet-completed session for this athlete + week from
// Supabase via PostgREST. Returns nulls when env is missing so the route
// can still fall back to demo data without crashing.
async function loadSessionData(athlete: Athlete) {
  const week = getCurrentWeek();
  const days = getDays(week, athlete);

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  const key  = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!base || !key) {
    return { week, days, completedKeys: new Set<string>(), nextSession: days[0] };
  }

  const url = `${base}/rest/v1/registros?athlete=eq.${encodeURIComponent(athlete)}&week=eq.${week}&select=day_key,completed`;
  let completedKeys = new Set<string>();
  try {
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      // Widgets are fine with a 5-min cache — Apple refresh budget makes
      // hot-fresh data pointless and saves Supabase rows.
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const rows = (await res.json()) as { day_key: string; completed: boolean }[];
      completedKeys = new Set(rows.filter((r) => r.completed).map((r) => r.day_key));
    }
  } catch {
    // network blip — degrade to "no rows completed"
  }

  const nextSession: Day = days.find((d) => !completedKeys.has(d.key)) ?? days[days.length - 1];
  return { week, days, completedKeys, nextSession };
}

// Parses the "RPE 6-7" string used in the plan into "6-7".
function extractRpe(raw: string): string {
  const m = raw.match(/(\d+(?:-\d+)?)/);
  return m ? m[1] : raw;
}

// Maps a DayKey ("D1"..."D4") to a short Spanish weekday label using the
// 2026-05-11 plan start. D1=Mon, D2=Tue, D3=Thu, D4=Sat is the common
// schedule — but since the data only carries D-key, we fall back to the
// raw key when in doubt.
function dayKeyToShort(key: string): string {
  switch (key) {
    case 'D1': return 'Lun';
    case 'D2': return 'Mar';
    case 'D3': return 'Jue';
    case 'D4': return 'Sáb';
    default:   return key;
  }
}

const JOYFUL = {
  from: '#d6f5ea',
  to:   '#8de2c9',
  bodyTop:    '#b8f0dd',
  bodyMid:    '#54c6a6',
  bodyBottom: '#218e72',
  accent:     '#1f7a63',
  ink:        '#1b1d1f',
  cream:      '#f4f0e6',
};

// 4 sessions per training week (D1-D4). Each cell: 0 pending, 1 done, 2 current.
function parseProgress(raw: string | null): number[] {
  const fallback = [1, 1, 2, 0];
  if (!raw) return fallback;
  const arr = raw.split(',').map((n) => Math.max(0, Math.min(2, parseInt(n.trim(), 10) || 0)));
  return arr.length >= 4 ? arr.slice(0, 4) : [...arr, ...fallback.slice(arr.length)];
}

interface Exercise { name: string; sets: string }
const DEFAULT_EXERCISES: Exercise[] = [
  { name: 'Sentadilla trasera', sets: '4×6' },
  { name: 'Trineo empuje',      sets: '6×20m' },
  { name: 'Remo invertido',     sets: '4×8' },
  { name: 'Plancha lateral',    sets: '3×30"' },
];

function parseExercises(raw: string | null): Exercise[] {
  if (!raw) return DEFAULT_EXERCISES;
  return raw.split('|').slice(0, 4).map((e) => {
    const [name, sets] = e.split(';');
    return { name: (name ?? '').trim(), sets: (sets ?? '').trim() };
  }).filter((e) => e.name);
}

// Loads Mona Sans OTFs from the deployment's /public folder. Edge can't
// use the filesystem; we fetch via the request origin which is the same
// host that serves the static files.
async function loadFonts(origin: string) {
  const variants: { name: 'Mona Sans'; weight: 400 | 500 | 700 | 800; file: string }[] = [
    { name: 'Mona Sans', weight: 400, file: 'MonaSans-Regular.otf' },
    { name: 'Mona Sans', weight: 500, file: 'MonaSans-Medium.otf' },
    { name: 'Mona Sans', weight: 700, file: 'MonaSans-Bold.otf' },
    { name: 'Mona Sans', weight: 800, file: 'MonaSans-ExtraBold.otf' },
  ];
  const fonts = await Promise.all(
    variants.map(async (v) => {
      const data = await fetch(`${origin}/fonts/otf/${v.file}`).then((r) => r.arrayBuffer());
      return { name: v.name, data, weight: v.weight, style: 'normal' as const };
    }),
  );
  return fonts;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const rawAthlete = url.searchParams.get('athlete') ?? 'Xabi';
  const athlete: Athlete = rawAthlete === 'MK' ? 'MK' : 'Xabi';
  const size = url.searchParams.get('size') === 'medium' ? 'medium' : 'small';
  const isDemo = url.searchParams.get('demo') === '1';

  // Real data unless ?demo=1.
  const real = isDemo
    ? null
    : await loadSessionData(athlete);

  const fallbackTitle = 'Fuerza + Trineo';
  const fallbackExercises: Exercise[] = DEFAULT_EXERCISES;
  const fallbackProgress = [1, 1, 2, 0];

  // Per-field: query string > real data > demo fallback.
  const title    = url.searchParams.get('title')    ?? real?.nextSession.title ?? fallbackTitle;
  const week     = url.searchParams.get('week')     ?? String(real?.week ?? 3);
  const planName = url.searchParams.get('planName') ?? 'Plan HYROX';
  const dayShort = url.searchParams.get('dayShort') ?? (real ? dayKeyToShort(real.nextSession.key) : 'Mié');
  const rpe      = url.searchParams.get('rpe')      ?? (real ? extractRpe(real.nextSession.rpe) : '7');
  // We don't track per-session duration yet — derive from a rough 8min/block
  // heuristic when working from real data, fall back to a flat default.
  const duration = url.searchParams.get('duration') ?? (
    real ? `${Math.max(30, real.nextSession.blocks.length * 12)} min` : '45 min'
  );

  const exercises: Exercise[] = url.searchParams.get('exercises')
    ? parseExercises(url.searchParams.get('exercises'))
    : real
      ? real.nextSession.blocks.map((b) => ({ name: b.name, sets: b.sets }))
      : fallbackExercises;

  // Volume = total sets across all blocks parsed as the leading integer in
  // "4x6" / "6x20m". Falls back to "N ejercicios" if parsing yields zero.
  const volumeQs = url.searchParams.get('volume');
  let volume: string;
  if (volumeQs) {
    volume = volumeQs;
  } else if (real) {
    const totalSets = real.nextSession.blocks.reduce((acc, b) => {
      const m = b.sets.match(/^(\d+)/);
      return acc + (m ? Number(m[1]) : 0);
    }, 0);
    volume = totalSets > 0 ? `${totalSets} series` : `${real.nextSession.blocks.length} ejercicios`;
  } else {
    volume = '12 series';
  }

  // Progress derived from real data: 1 for completed sessions, 2 for the
  // first not-yet-done (the "next"), 0 for the rest.
  let progress: number[];
  if (url.searchParams.get('progress')) {
    progress = parseProgress(url.searchParams.get('progress'));
  } else if (real) {
    let nextMarked = false;
    progress = real.days.map((d) => {
      if (real.completedKeys.has(d.key)) return 1;
      if (!nextMarked) { nextMarked = true; return 2; }
      return 0;
    });
    // Pad/trim to 4 to keep the stepper layout stable.
    while (progress.length < 4) progress.push(0);
    progress = progress.slice(0, 4);
  } else {
    progress = fallbackProgress;
  }

  // Streak: rough — count consecutive done from the start of the week.
  const streakQs = url.searchParams.get('streak');
  let streak: string;
  if (streakQs) {
    streak = streakQs;
  } else if (real) {
    let n = 0;
    for (const v of progress) {
      if (v === 1) n++;
      else break;
    }
    streak = String(n);
  } else {
    streak = '5';
  }

  // Stepper labels follow the D1-D4 cadence of the training plan.
  const dowLabels: string[] = (real?.days ?? []).map((d) => d.key as string);
  while (dowLabels.length < 4) dowLabels.push(`D${dowLabels.length + 1}`);

  const doneCount = progress.filter((p) => p === 1).length;

  const W = size === 'medium' ? 720 : 360;
  const H = size === 'medium' ? 340 : 360;

  const fonts = await loadFonts(origin);

  // --- Shared atoms -------------------------------------------------------

  const Eyebrow = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(255,255,255,0.85)',
        padding: '7px 14px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1.2,
        color: JOYFUL.accent,
        textTransform: 'uppercase',
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: 999, background: JOYFUL.accent, display: 'flex' }} />
      <div style={{ display: 'flex' }}>{dayShort} · S{week}</div>
    </div>
  );

  const TapArrow = (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 999,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(15,40,32,0.18), 0 1px 0 rgba(255,255,255,0.6) inset',
      }}
    >
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={JOYFUL.ink} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1={7} y1={17} x2={17} y2={7} />
        <polyline points="8,7 17,7 17,16" />
      </svg>
    </div>
  );

  const ChipDark = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        background: JOYFUL.ink,
        color: '#ffffff',
        padding: '7px 13px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
      }}
    >
      {icon}
      <div style={{ display: 'flex' }}>{text}</div>
    </div>
  );

  const ChipLight = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        background: '#ffffff',
        color: JOYFUL.ink,
        padding: '7px 13px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      {icon}
      <div style={{ display: 'flex' }}>{text}</div>
    </div>
  );

  const IconStar = (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="#ffd987">
      <polygon points="12,2 15,9 22,9 16.5,13.5 19,21 12,16.5 5,21 7.5,13.5 2,9 9,9" />
    </svg>
  );
  const IconClock = (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={JOYFUL.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={12} cy={12} r={9} />
      <polyline points="12,7 12,12 16,14" />
    </svg>
  );
  const IconFlame = (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="#ff8a5a">
      <path d="M12 2c1 4 5 5 5 10a5 5 0 1 1-10 0c0-3 2-4 2-7 1 1 2 2 3 1z" />
    </svg>
  );
  const IconStack = (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={JOYFUL.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={4} y={4} width={16} height={5} rx={2} />
      <rect x={4} y={11} width={16} height={5} rx={2} />
      <rect x={4} y={18} width={16} height={3} rx={1.5} />
    </svg>
  );

  const Stepper = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      {progress.map((s, i) => {
        const done = s === 1;
        const current = s === 2;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: current ? JOYFUL.accent : done ? `${JOYFUL.accent}26` : '#ffffff',
                border: current ? 'none' : `2px solid ${done ? JOYFUL.accent : 'rgba(27,29,31,0.14)'}`,
                boxShadow: current ? '0 3px 8px rgba(31,122,99,0.35)' : 'none',
              }}
            >
              {current ? (
                <div style={{ width: 9, height: 9, borderRadius: 999, background: '#ffffff', display: 'flex' }} />
              ) : done ? (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={JOYFUL.accent} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5,13 10,18 19,7" />
                </svg>
              ) : (
                <div style={{ display: 'flex' }} />
              )}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 10,
                fontWeight: 800,
                color: current ? JOYFUL.ink : 'rgba(27,29,31,0.45)',
              }}
            >
              {dowLabels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );

  // --- SMALL ---------------------------------------------------------------

  if (size === 'small') {
    const tree = (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          padding: 14,
          gap: 12,
          fontFamily: '"Mona Sans"',
          color: JOYFUL.ink,
        }}
      >
        {/* Hero panel — generous rounding + soft inset shadow for depth */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            borderRadius: 26,
            background: `linear-gradient(160deg, ${JOYFUL.from} 0%, ${JOYFUL.to} 60%, ${JOYFUL.bodyMid} 100%)`,
            boxShadow: 'inset 0 -12px 22px rgba(33,142,114,0.12), inset 0 1px 0 rgba(255,255,255,0.55)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {Eyebrow}
            {TapArrow}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', fontSize: 10, fontWeight: 800, letterSpacing: 1.3, color: JOYFUL.accent, textTransform: 'uppercase' }}>
              {planName} · {athlete}
            </div>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, color: JOYFUL.ink, letterSpacing: -0.5, lineHeight: 1.02 }}>
              {title}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <ChipDark icon={IconStar} text={`RPE ${rpe}`} />
            <ChipLight icon={IconClock} text={duration} />
          </div>
        </div>

        {/* Exercise preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, padding: '0 4px' }}>
          {exercises.slice(0, 3).map((ex, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '4px 0',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 8,
                  background: `${JOYFUL.bodyMid}22`,
                  color: JOYFUL.accent,
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i + 1}
              </div>
              <div style={{ display: 'flex', flex: 1, fontSize: 12, fontWeight: 700, color: JOYFUL.ink }}>
                {ex.name}
              </div>
              <div style={{ display: 'flex', fontSize: 11, fontWeight: 800, color: 'rgba(27,29,31,0.55)' }}>
                {ex.sets}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 12px',
            background: JOYFUL.cream,
            borderRadius: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {IconFlame}
            <div style={{ display: 'flex', fontSize: 11, fontWeight: 800, color: JOYFUL.ink }}>
              {streak} días
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 11, fontWeight: 800, color: 'rgba(27,29,31,0.6)' }}>
            {doneCount}/{progress.length} esta semana
          </div>
        </div>
      </div>
    );
    return new ImageResponse(tree, { width: W, height: H, fonts });
  }

  // --- MEDIUM --------------------------------------------------------------

  const tree = (
    <div
      style={{
        width: W,
        height: H,
        display: 'flex',
        background: '#ffffff',
        padding: 16,
        gap: 14,
        fontFamily: '"Mona Sans"',
        color: JOYFUL.ink,
      }}
    >
      {/* Hero panel — left */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1.15,
          padding: 20,
          borderRadius: 28,
          background: `linear-gradient(160deg, ${JOYFUL.from} 0%, ${JOYFUL.to} 50%, ${JOYFUL.bodyMid} 100%)`,
          boxShadow: 'inset 0 -14px 28px rgba(33,142,114,0.13), inset 0 1px 0 rgba(255,255,255,0.55)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {Eyebrow}
          {TapArrow}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', fontSize: 10, fontWeight: 800, letterSpacing: 1.4, color: JOYFUL.accent, textTransform: 'uppercase' }}>
            {planName} · {athlete}
          </div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: JOYFUL.ink, letterSpacing: -0.6, lineHeight: 1 }}>
            {title}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <ChipDark icon={IconStar} text={`RPE ${rpe}`} />
            <ChipLight icon={IconClock} text={duration} />
            <ChipLight icon={IconStack} text={volume} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.55)',
            padding: '8px 14px',
            borderRadius: 16,
          }}
        >
          {IconFlame}
          <div style={{ display: 'flex', fontSize: 11, fontWeight: 800, color: JOYFUL.ink }}>
            {streak} días seguidos · {doneCount}/{progress.length} esta semana
          </div>
        </div>
      </div>

      {/* Right column — exercise list + week stepper */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          padding: 16,
          borderRadius: 28,
          background: JOYFUL.cream,
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ display: 'flex', fontSize: 10, fontWeight: 800, letterSpacing: 1.3, color: 'rgba(27,29,31,0.55)', textTransform: 'uppercase' }}>
              Ejercicios
            </div>
            <div style={{ display: 'flex', fontSize: 10, fontWeight: 800, color: 'rgba(27,29,31,0.55)' }}>
              {exercises.length} en total
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {exercises.slice(0, 4).map((ex, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#ffffff',
                  padding: '7px 11px',
                  borderRadius: 14,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: JOYFUL.accent,
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ display: 'flex', flex: 1, fontSize: 12, fontWeight: 700, color: JOYFUL.ink }}>
                  {ex.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 11,
                    fontWeight: 800,
                    color: JOYFUL.accent,
                    background: `${JOYFUL.bodyMid}22`,
                    padding: '3px 9px',
                    borderRadius: 999,
                  }}
                >
                  {ex.sets}
                </div>
              </div>
            ))}
          </div>
        </div>
        {Stepper}
      </div>
    </div>
  );

  return new ImageResponse(tree, { width: W, height: H, fonts });
}
