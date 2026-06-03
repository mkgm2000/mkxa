'use client';

import type { Mood } from '@/lib/moods';
import clsx from 'clsx';

// Hand-drawn mood faces inspired by the user's "Mood Faces" reference.
// Pastel circle background + ink strokes for the features. One file per
// mood would be over-engineering; the SVG paths fit in a small table.

interface FaceSpec {
  bg: string;
  line: string;
  /** SVG fragment rendered inside a 100×100 viewBox. `currentColor` ==
   *  the line colour so strokes can inherit it. */
  draw: React.ReactNode;
  /** Extra decorative element rendered above the circle (Z's, hearts). */
  decoration?: 'zz' | 'hearts';
}

const FACES: Record<Mood, FaceSpec> = {
  happy: {
    bg: '#B7DDF1',
    line: '#1e4a78',
    draw: (
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round">
        <circle cx={36} cy={42} r={3.4} fill="currentColor" stroke="none" />
        <circle cx={64} cy={42} r={3.4} fill="currentColor" stroke="none" />
        <path d="M34 60 Q 50 72 66 60" fill="none" />
      </g>
    ),
  },
  joyful: {
    bg: '#FFE26B',
    line: '#7a5a00',
    draw: (
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round" fill="none">
        <path d="M28 40 Q 36 32 44 40" />
        <path d="M56 40 Q 64 32 72 40" />
        <path d="M30 56 Q 50 78 70 56 Q 50 66 30 56 Z" fill="currentColor" />
      </g>
    ),
  },
  love: {
    bg: '#F4B5C9',
    line: '#8a2d4f',
    decoration: 'hearts',
    draw: (
      <g stroke="currentColor" strokeWidth={4} strokeLinecap="round" fill="none">
        <path d="M28 38 Q 28 32 33 32 Q 38 32 38 38 Q 38 44 33 48 Q 28 44 28 38 Z" fill="currentColor" />
        <path d="M62 38 Q 62 32 67 32 Q 72 32 72 38 Q 72 44 67 48 Q 62 44 62 38 Z" fill="currentColor" />
        <path d="M34 62 Q 50 74 66 62" strokeWidth={5} />
        <circle cx={24} cy={58} r={3} fill="currentColor" opacity={0.35} stroke="none" />
        <circle cx={76} cy={58} r={3} fill="currentColor" opacity={0.35} stroke="none" />
      </g>
    ),
  },
  sad: {
    bg: '#9DB9DE',
    line: '#23437a',
    draw: (
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round" fill="none">
        <circle cx={36} cy={44} r={3.4} fill="currentColor" stroke="none" />
        <circle cx={64} cy={44} r={3.4} fill="currentColor" stroke="none" />
        <path d="M32 66 Q 50 54 68 66" />
        <path d="M36 50 Q 33 58 36 60 Q 39 58 36 50 Z" fill="currentColor" opacity={0.5} stroke="none" />
      </g>
    ),
  },
  worried: {
    bg: '#B6A6E8',
    line: '#3f2c87',
    draw: (
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round" fill="none">
        <path d="M28 36 L 42 32" />
        <path d="M72 36 L 58 32" />
        <ellipse cx={38} cy={48} rx={3.2} ry={3.8} fill="currentColor" stroke="none" />
        <ellipse cx={62} cy={48} rx={3.2} ry={3.8} fill="currentColor" stroke="none" />
        <path d="M34 68 Q 50 58 66 68" />
      </g>
    ),
  },
  annoyed: {
    bg: '#D8D0C2',
    line: '#5a503e',
    draw: (
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round" fill="none">
        <path d="M30 42 Q 38 38 44 42" />
        <path d="M56 42 Q 64 38 72 42" />
        <path d="M36 64 L 64 64" />
      </g>
    ),
  },
  angry: {
    bg: '#F2A082',
    line: '#7a2a10',
    draw: (
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round" fill="none">
        <path d="M28 36 L 44 44" />
        <path d="M72 36 L 56 44" />
        <circle cx={38} cy={50} r={3.2} fill="currentColor" stroke="none" />
        <circle cx={62} cy={50} r={3.2} fill="currentColor" stroke="none" />
        <path d="M34 68 Q 50 58 66 68" />
      </g>
    ),
  },
  stressed: {
    bg: '#F8C7A0',
    line: '#7a3e16',
    draw: (
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round" fill="none">
        <path d="M28 36 L 44 40" />
        <path d="M72 36 L 56 40" />
        <ellipse cx={38} cy={50} rx={5} ry={5.5} fill="#fff" />
        <ellipse cx={62} cy={50} rx={5} ry={5.5} fill="#fff" />
        <circle cx={38} cy={51} r={1.6} fill="currentColor" stroke="none" />
        <circle cx={62} cy={51} r={1.6} fill="currentColor" stroke="none" />
        <polyline points="32,66 40,62 48,68 56,62 64,68 68,64" strokeWidth={4} />
      </g>
    ),
  },
  dizzy: {
    bg: '#B79BD9',
    line: '#3d2080',
    draw: (
      <g stroke="currentColor" strokeWidth={4} strokeLinecap="round" fill="none">
        <line x1={30} y1={38} x2={42} y2={50} />
        <line x1={42} y1={38} x2={30} y2={50} />
        <line x1={58} y1={38} x2={70} y2={50} />
        <line x1={70} y1={38} x2={58} y2={50} />
        <path d="M32 64 Q 40 58 48 64 T 64 64 T 70 62" strokeWidth={5} />
      </g>
    ),
  },
  sleepy: {
    bg: '#C8C2E5',
    line: '#3d3a6e',
    decoration: 'zz',
    draw: (
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round" fill="none">
        <path d="M30 44 Q 38 50 46 44" />
        <path d="M54 44 Q 62 50 70 44" />
        <circle cx={50} cy={64} r={4} fill="none" />
      </g>
    ),
  },
  neutral: {
    bg: '#E2DDD0',
    line: '#5a503e',
    draw: (
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round" fill="none">
        <circle cx={36} cy={44} r={3.4} fill="currentColor" stroke="none" />
        <circle cx={64} cy={44} r={3.4} fill="currentColor" stroke="none" />
        <path d="M36 64 L 64 64" />
      </g>
    ),
  },
};

interface MoodFaceProps {
  mood: Mood;
  size?: number;
  className?: string;
  /** Shows a shadow ring around the circle. Defaults to true; disable
   *  on tiny calendar cells where the ring crowds the layout. */
  shadow?: boolean;
}

export function MoodFace({ mood, size = 56, className, shadow = true }: MoodFaceProps) {
  const spec = FACES[mood];
  return (
    <span
      className={clsx('relative inline-flex items-center justify-center rounded-full', className)}
      style={{
        backgroundColor: spec.bg,
        color: spec.line,
        width: size,
        height: size,
        boxShadow: shadow ? '0 1px 2px rgba(0,0,0,0.07)' : undefined,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" width="68%" height="68%" fill="none">
        {spec.draw}
      </svg>
      {spec.decoration === 'zz' && (
        <span
          className="absolute font-bold"
          style={{
            top: '8%',
            right: '8%',
            fontSize: Math.max(8, size * 0.22),
            color: spec.line,
            opacity: 0.85,
          }}
        >
          z
        </span>
      )}
      {spec.decoration === 'hearts' && (
        <>
          <span
            className="absolute"
            style={{ top: '10%', left: '12%', fontSize: Math.max(8, size * 0.2), color: '#d63a6a' }}
          >
            ♥
          </span>
          <span
            className="absolute"
            style={{ top: '14%', right: '14%', fontSize: Math.max(6, size * 0.16), color: '#d63a6a', opacity: 0.85 }}
          >
            ♥
          </span>
        </>
      )}
    </span>
  );
}

export const MOOD_FACE_BG: Record<Mood, string> = Object.fromEntries(
  (Object.entries(FACES) as [Mood, FaceSpec][]).map(([k, v]) => [k, v.bg]),
) as Record<Mood, string>;
