'use client';

import { useId } from 'react';
import clsx from 'clsx';
import styles from './mood-blob.module.css';
import { getMoodTokens, type Mood } from '@/lib/moods';

export interface MoodBlobProps {
  mood: Mood;
  size?: number;
  animate?: boolean;
  withFloor?: boolean;
  withParticles?: boolean;
  className?: string;
}

const BODY_PATH =
  'M110 14 C 58 14, 20 56, 20 114 C 20 162, 56 198, 110 198 C 164 198, 200 162, 200 114 C 200 56, 162 14, 110 14 Z';

export function MoodBlob({
  mood,
  size = 220,
  animate = true,
  withFloor = true,
  withParticles = true,
  className,
}: MoodBlobProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const bodyId  = `body-${mood}-${uid}`;
  const hiId    = `hi-${mood}-${uid}`;
  const shadeId = `shade-${mood}-${uid}`;
  const tokens  = getMoodTokens(mood);
  const label   = `Mood ${mood}`;

  return (
    <div
      className={clsx(
        styles.stage,
        animate && styles[`m-${mood}`],
        className
      )}
      style={{ width: size, height: size }}
    >
      {withFloor && <div className={styles.floor} />}
      <div className={styles.blob}>
        <svg
          viewBox="0 0 220 220"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={label}
          width="100%"
          height="100%"
        >
          <defs>
            <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={tokens.bodyTop}    />
              <stop offset="55%"  stopColor={tokens.bodyMid}    />
              <stop offset="100%" stopColor={tokens.bodyBottom} />
            </linearGradient>
            <radialGradient id={hiId} cx="50%" cy="22%" r="55%">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
            </radialGradient>
            <radialGradient id={shadeId} cx="50%" cy="90%" r="60%">
              <stop offset="0%"   stopColor={tokens.bodyBottom} stopOpacity="0.35" />
              <stop offset="100%" stopColor={tokens.bodyBottom} stopOpacity="0"    />
            </radialGradient>
          </defs>
          <path d={BODY_PATH} fill={`url(#${bodyId})`} />
          <ellipse cx="110" cy="58"  rx="68" ry="42" fill={`url(#${hiId})`}    />
          <ellipse cx="110" cy="170" rx="80" ry="28" fill={`url(#${shadeId})`} />
          {tokens.cheek && (
            <>
              <ellipse cx="55"  cy="128" rx="12" ry="7.5" fill={tokens.cheek} opacity={tokens.cheekOpacity ?? 0.5} />
              <ellipse cx="165" cy="128" rx="12" ry="7.5" fill={tokens.cheek} opacity={tokens.cheekOpacity ?? 0.5} />
            </>
          )}
          <Face mood={mood} />
        </svg>
      </div>
      {withParticles && <Particles mood={mood} />}
    </div>
  );
}

function Face({ mood }: { mood: Mood }) {
  const stroke = '#1b1d1f';
  switch (mood) {
    case 'happy':
      return (
        <>
          <path d="M66 110 Q 80 90, 94 110"   fill="none" stroke={stroke} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M126 110 Q 140 90, 154 110" fill="none" stroke={stroke} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M68 134 Q 110 184, 152 134" fill="none" stroke={stroke} strokeWidth="7.5" strokeLinecap="round" />
        </>
      );
    case 'joyful':
      return (
        <>
          <ellipse cx="80"  cy="108" rx="5" ry="7" fill={stroke} />
          <ellipse cx="140" cy="108" rx="5" ry="7" fill={stroke} />
          <path d="M78 140 Q 110 168, 142 140" fill="none" stroke={stroke} strokeWidth="6.5" strokeLinecap="round" />
        </>
      );
    case 'annoyed':
      return (
        <g className={styles.eyeRoll}>
          <ellipse cx="78"  cy="112" rx="13" ry="8" fill="#ffffff" />
          <ellipse cx="142" cy="112" rx="13" ry="8" fill="#ffffff" />
          <path d="M65 108 L 91 108"  stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <path d="M129 108 L 155 108" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <circle cx="78"  cy="113" r="3" fill={stroke} />
          <circle cx="142" cy="113" r="3" fill={stroke} />
          <line x1="80" y1="140" x2="140" y2="140" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'worried':
      return (
        <>
          <path d="M65 96 Q 80 88, 96 96"   fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <path d="M124 96 Q 140 88, 156 96" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="82"  cy="116" rx="4" ry="5.5" fill={stroke} />
          <ellipse cx="138" cy="116" rx="4" ry="5.5" fill={stroke} />
          <path
            className={styles.worryMouth}
            d="M75 148 Q 88 140, 100 148 T 125 148 T 150 148"
            fill="none"
            stroke={stroke}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      );
    case 'dizzy':
      return (
        <>
          <path
            className={styles.spiralL}
            d="M75 110 m -10 0 a 10 10 0 1 0 20 0 a 7 7 0 1 0 -14 0 a 4 4 0 1 0 8 0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className={styles.spiralR}
            d="M145 110 m -10 0 a 10 10 0 1 0 20 0 a 7 7 0 1 0 -14 0 a 4 4 0 1 0 8 0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line x1="80" y1="148" x2="140" y2="148" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case 'sad':
      return (
        <>
          <path d="M65 96 Q 80 88, 96 96"   fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <path d="M124 96 Q 140 88, 156 96" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <path d="M70 118 Q 82 128, 94 118"   fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <path d="M126 118 Q 138 128, 150 118" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <path d="M70 162 Q 110 138, 150 162" fill="none" stroke={stroke} strokeWidth="6.5" strokeLinecap="round" />
          <path
            className={styles.tear}
            d="M90 130 q -4 8 0 14 q 4 -6 0 -14 z"
            fill="#7aaaff"
          />
        </>
      );
    case 'angry':
      return (
        <>
          <path d="M62 92 L 96 102"   stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <path d="M158 92 L 124 102" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="84"  cy="118" rx="4" ry="5" fill={stroke} />
          <ellipse cx="136" cy="118" rx="4" ry="5" fill={stroke} />
          <path d="M76 152 Q 110 134, 144 152" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        </>
      );
    case 'love':
      return (
        <>
          <path
            className={styles.heartEye}
            d="M75 110 c -6 -8 -18 -6 -18 4 c 0 8 18 16 18 16 c 0 0 18 -8 18 -16 c 0 -10 -12 -12 -18 -4 z"
            fill="#e23a5a"
          />
          <path
            className={styles.heartEye}
            d="M145 110 c -6 -8 -18 -6 -18 4 c 0 8 18 16 18 16 c 0 0 18 -8 18 -16 c 0 -10 -12 -12 -18 -4 z"
            fill="#e23a5a"
          />
          <path d="M86 150 Q 110 168, 134 150" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case 'sleepy':
      return (
        <>
          <path d="M68 108 Q 82 118, 96 108"   fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <path d="M124 108 Q 138 118, 152 108" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="110" cy="148" rx="8" ry="4" fill={stroke} />
        </>
      );
    case 'neutral':
      return (
        <>
          <ellipse cx="82"  cy="112" rx="4" ry="5" fill={stroke} />
          <ellipse cx="138" cy="112" rx="4" ry="5" fill={stroke} />
          <line x1="84" y1="148" x2="136" y2="148" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </>
      );
  }
}

function Particles({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'happy':
      return (
        <div className={styles.ambient}>
          <i className={styles.sparkle} style={{ top: '18%', left:  '22%', animationDelay: '0s'   }} />
          <i className={styles.sparkle} style={{ top: '14%', right: '26%', animationDelay: '0.7s' }} />
          <i className={styles.sparkle} style={{ top: '30%', right: '14%', animationDelay: '1.4s' }} />
        </div>
      );
    case 'joyful':
      return (
        <div className={styles.ambient}>
          <i className={styles.sparkle} style={{ top: '12%', left:  '18%', animationDelay: '0.3s' }} />
          <i className={styles.sparkle} style={{ top: '22%', right: '18%', animationDelay: '1s'   }} />
          <i className={styles.sparkle} style={{ top: '40%', left:  '10%', animationDelay: '1.7s' }} />
        </div>
      );
    case 'worried':
      return (
        <div className={styles.ambient}>
          <i className={styles.sweat} style={{ top: '14%', right: '24%' }} />
        </div>
      );
    case 'angry':
      return (
        <div className={styles.ambient}>
          <i className={styles.steam} style={{ top: '6%', left: '34%', animationDelay: '0s'   }} />
          <i className={styles.steam} style={{ top: '6%', left: '50%', animationDelay: '0.5s' }} />
          <i className={styles.steam} style={{ top: '6%', left: '66%', animationDelay: '1s'   }} />
        </div>
      );
    case 'love':
      return (
        <div className={styles.ambient}>
          <i className={styles.heart} style={{ bottom: '20%', left:  '20%', animationDelay: '0s'   }} />
          <i className={styles.heart} style={{ bottom: '24%', left:  '50%', animationDelay: '0.6s' }} />
          <i className={styles.heart} style={{ bottom: '18%', right: '20%', animationDelay: '1.2s' }} />
        </div>
      );
    case 'sleepy':
      return (
        <div className={styles.ambient}>
          <i className={styles.zee} style={{ top: '18%', right: '20%', animationDelay: '0s'   }} />
          <i className={styles.zee} style={{ top: '8%',  right: '12%', animationDelay: '0.8s' }} />
          <i className={styles.zee} style={{ top: '0%',  right: '4%',  animationDelay: '1.6s' }} />
        </div>
      );
    default:
      return null;
  }
}
