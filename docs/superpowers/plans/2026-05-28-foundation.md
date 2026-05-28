# MKXA Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset the `mkxa` repo to a Next.js app, build the complete design system (Mona Sans + 10 mood blob characters + nav + controls + feedback primitives), implement the daily mood check-in gate and home dashboard shell. End state: an athlete picks MK or Xabi, is gated by a mood check-in on first daily open, then lands on a home dashboard skeleton tinted by today's mood.

**Architecture:** Next.js 14+ App Router with TypeScript. Client components for everything in this phase (no RSC data fetching yet). Supabase JS v2 with anon key for `mood_logs` only. Tailwind v3.4 with custom design tokens lifted from the spec and the `docs/design-handoff/mood_characters/` handoff. Mona Sans self-hosted via `next/font/local`. Lucide-react for all icons, stroke-width 1.5. Zustand for the global save state. Vitest + React Testing Library + jsdom for tests. The 10 mood blobs are reproduced 1:1 from the handoff (SVG paths, gradients, animations) inside a single React component with namespaced `useId()` gradient ids.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind v3.4, Supabase (existing project), Mona Sans (OFL), lucide-react, Zustand, Vitest, @testing-library/react, jsdom.

**Reference docs:**
- `docs/superpowers/specs/2026-05-28-mkxa-life-app-design.md` — spec.
- `docs/design-handoff/mood_characters/Mood Characters.html` — pixel-perfect handoff for blobs.
- `docs/design-handoff/mood_characters/README.md` — handoff documentation.
- `legacy/index.html` (after Task 1) — original HYROX behaviour for future training port (not used in this plan).

---

## File Structure

| File | Purpose |
|---|---|
| `legacy/index.html` | The original single-file app, preserved for reference and future training port. |
| `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs` | Standard Next.js scaffold. |
| `app/layout.tsx` | Root layout: Mona Sans font, athlete-context provider, save-state provider. |
| `app/page.tsx` | Root route: redirect to `/pick` or `/home`. |
| `app/pick/page.tsx` | Athlete picker (MK / Xabi). |
| `app/(app)/layout.tsx` | App shell: `<MoodGate>` + `<BottomNav>`. |
| `app/(app)/home/page.tsx` | Home shell with greeting, segmented control, week dots row. |
| `app/globals.css` | Tailwind imports + CSS variables for mood gradients. |
| `public/fonts/MonaSans-*.woff2` | Self-hosted font files. |
| `lib/moods.ts` | Mood type, ordered list, per-mood tokens (body gradient, card gradient, ink uses). |
| `lib/supabase/client.ts` | Browser supabase client singleton. |
| `lib/supabase/server.ts` | Server supabase client factory (unused in this plan but ready for later). |
| `lib/athlete-context.tsx` | React Context + localStorage persistence for `MK \| Xabi`. |
| `lib/hooks/use-mood-today.ts` | Hook that reads/writes `mood_logs` for current athlete + today. |
| `lib/save-state.ts` | Zustand store for global save status (`idle \| saving \| saved \| error`). |
| `lib/date.ts` | Date helpers: `todayISO()`, `startOfWeekISO()`, `weekDays(start)`. |
| `components/mood/MoodBlob.tsx` | 10-variant SVG blob with animations. |
| `components/mood/mood-blob.module.css` | All keyframes from the handoff. |
| `components/mood/MoodGradientBg.tsx` | Full-screen 170° gradient wrapper tinted by a mood. |
| `components/mood/MoodTokenStrip.tsx` | Horizontal-scroll picker of mini blobs. |
| `components/mood/WaveDecoration.tsx` | Static SVG audio-wave decoration. |
| `components/mood/MoodCheckIn.tsx` | Full-screen daily check-in. |
| `components/mood/MoodGate.tsx` | Gates children behind the daily check-in. |
| `components/nav/BottomNav.tsx` | Floating white pill, 5 lucide icons. |
| `components/nav/HeaderActionButton.tsx` | Circular 40x40 header button. |
| `components/controls/SegmentedDayWeekMonth.tsx` | Pill row with sliding black active indicator. |
| `components/feedback/InlineSaveText.tsx` | Muted save-status text under page headers. |
| `components/home/GreetingHeader.tsx` | Time-aware greeting + bell. |
| `components/home/WeekMoodDotsRow.tsx` | 7-day mood circles row. |
| `supabase/migrations/20260528120000_mood_logs.sql` | Schema for `mood_logs`. |
| `vitest.config.ts`, `vitest.setup.ts` | Test framework configuration. |
| `__tests__/...` | Co-located or root tests directory. |

---

## Pre-flight

- [ ] **Pre-flight: confirm working directory and clean tree**

Run:
```bash
cd ~/IdeaProjects/mkxa
pwd
git status
git log --oneline -3
```
Expected: pwd `~/IdeaProjects/mkxa`, working tree clean, latest commit is `7ea7959 docs: add life-app design spec + mood characters handoff`.

---

## Task 1: Preserve legacy and stage scaffold

**Files:**
- Modify (move): `index.html` → `legacy/index.html`
- Modify (delete after scaffold imports it): root noise

- [ ] **Step 1: Move legacy file**

```bash
cd ~/IdeaProjects/mkxa
mkdir -p legacy
git mv index.html legacy/index.html
git status
```
Expected: `renamed: index.html -> legacy/index.html`.

- [ ] **Step 2: Commit the move alone (small, reviewable)**

```bash
git commit -m "chore: move original index.html to legacy/

Preserved for behavioural reference during the Next.js HYROX port.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
Expected: 1 file changed, rename detected, no content diff.

---

## Task 2: Scaffold Next.js + TypeScript + Tailwind

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `.eslintrc.json`
- Create: `next-env.d.ts`

- [ ] **Step 1: Run create-next-app non-interactive into the current directory**

```bash
cd ~/IdeaProjects/mkxa
npx --yes create-next-app@14 . \
  --typescript --tailwind --eslint --app \
  --src-dir=false --import-alias="@/*" --use-npm \
  --no-experimental-app
```
The CLI may refuse because the directory is not empty. If it does, use:
```bash
cd ~/IdeaProjects/mkxa
mkdir _scaffold && cd _scaffold && \
  npx --yes create-next-app@14 . --typescript --tailwind --eslint --app \
    --src-dir=false --import-alias="@/*" --use-npm && \
  shopt -s dotglob && mv ./* .. && cd .. && rmdir _scaffold
```
Expected: scaffold files present, `npm install` completed.

- [ ] **Step 2: Verify Next.js starts**

Run:
```bash
npm run dev > /tmp/mkxa-dev.log 2>&1 &
sleep 6
curl -sf http://localhost:3000 | head -20
kill %1
```
Expected: HTML 200 with "Next.js" or template page content.

- [ ] **Step 3: Replace template app/page.tsx with a clean placeholder**

Replace contents of `app/page.tsx`:
```tsx
export default function RootPage() {
  return null;
}
```

- [ ] **Step 4: Replace template app/globals.css with Tailwind directives only**

Replace contents of `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { height: 100%; }
body { color: #1b1d1f; }
```

- [ ] **Step 5: Commit scaffold**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 + TypeScript + Tailwind

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Install runtime + dev dependencies

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install runtime deps**

```bash
npm install \
  @supabase/supabase-js@^2.45.0 \
  @anthropic-ai/sdk@^0.27.0 \
  lucide-react@^0.460.0 \
  zustand@^5.0.0 \
  zod@^3.23.0 \
  clsx@^2.1.1
```
Expected: success, no peer-dep warnings about React/Next mismatches.

- [ ] **Step 2: Install dev deps for testing**

```bash
npm install -D \
  vitest@^2.1.0 \
  @vitejs/plugin-react@^4.3.0 \
  @testing-library/react@^16.0.0 \
  @testing-library/jest-dom@^6.5.0 \
  @testing-library/user-event@^14.5.0 \
  jsdom@^25.0.0 \
  @types/node
```
Expected: success.

- [ ] **Step 3: Commit deps**

```bash
git add package.json package-lock.json
git commit -m "feat: install supabase, anthropic, lucide, zustand, zod, vitest, RTL

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json` (add `test` script)

- [ ] **Step 1: Write Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **Step 2: Write setup file**

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: Add test scripts to package.json**

In `package.json`, in the `"scripts"` block, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs (no tests yet → passes vacuously)**

Run:
```bash
npm test
```
Expected: `No test files found` exits with code 0 (or use `--passWithNoTests`).

If exit is non-zero on empty, add the flag. Update the `test` script to:
```json
"test": "vitest run --passWithNoTests"
```
Re-run and confirm exit 0.

- [ ] **Step 5: Commit vitest setup**

```bash
git add vitest.config.ts vitest.setup.ts package.json
git commit -m "feat: configure Vitest + React Testing Library

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Mona Sans font setup

**Files:**
- Create: `public/fonts/MonaSans-Regular.woff2`, `MonaSans-Medium.woff2`, `MonaSans-Bold.woff2`, `MonaSans-ExtraBold.woff2`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Download Mona Sans woff2 from the official GitHub release**

```bash
mkdir -p public/fonts
cd public/fonts
for w in Regular Medium Bold ExtraBold; do
  curl -fLO "https://github.com/github/mona-sans/raw/main/fonts/webfonts/MonaSans-${w}.woff2"
done
ls -la MonaSans-*.woff2
cd ../..
```
Expected: four `MonaSans-*.woff2` files present, non-zero size. If 404, fall back to the variable font:
```bash
curl -fLO "https://github.com/github/mona-sans/raw/main/fonts/webfonts/MonaSans[wdth,wght].woff2"
```
and the layout step below will load the variable font instead. If both fail, stop and ask the user for the files.

- [ ] **Step 2: Wire Mona Sans into the root layout**

Replace contents of `app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const monaSans = localFont({
  src: [
    { path: '../public/fonts/MonaSans-Regular.woff2',   weight: '400', style: 'normal' },
    { path: '../public/fonts/MonaSans-Medium.woff2',    weight: '500', style: 'normal' },
    { path: '../public/fonts/MonaSans-Bold.woff2',      weight: '700', style: 'normal' },
    { path: '../public/fonts/MonaSans-ExtraBold.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-mona',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MKXA',
  description: 'Daily life app for MK and Xabi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={monaSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```
(If you fell back to the variable font, the `src` array becomes a single entry pointing at `MonaSans[wdth,wght].woff2`.)

- [ ] **Step 3: Commit fonts**

```bash
git add public/fonts/MonaSans-*.woff2 app/layout.tsx
git commit -m "feat: self-host Mona Sans with next/font/local

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Tailwind tokens

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the full tokens**

Replace contents of `tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-mona)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#1b1d1f',
        'ink-muted': 'rgba(27,29,31,0.45)',
        'ink-soft': 'rgba(27,29,31,0.15)',
        danger: '#ff3b30',
        mood: {
          'happy-from':   '#fff4d8', 'happy-to':   '#ffd987',
          'joyful-from':  '#d6f5ea', 'joyful-to':  '#8de2c9',
          'annoyed-from': '#ece0ff', 'annoyed-to': '#c4a3ff',
          'worried-from': '#fff1d6', 'worried-to': '#ffd07a',
          'dizzy-from':   '#ffe0e1', 'dizzy-to':   '#ff9ca0',
          'sad-from':     '#e3ecff', 'sad-to':     '#a3bcff',
          'angry-from':   '#ffdcdc', 'angry-to':   '#ff7e7e',
          'love-from':    '#ffe2ec', 'love-to':    '#ffa3bc',
          'sleepy-from':  '#ece4ff', 'sleepy-to':  '#b9a3e8',
          'neutral-from': '#f0eee9', 'neutral-to': '#d6cfc1',
        },
        cat: {
          comida:        '#77d6bd',
          casa:          '#b587fb',
          transporte:    '#a3bcff',
          ocio:          '#fed282',
          salud:         '#ff8a8e',
          suscripciones: '#c4a3ff',
          otros:         '#d6cfc1',
        },
      },
      borderRadius: {
        card:   '28px',
        mood:   '36px',
        item:   '20px',
        sheet:  '36px',
        action: '16px',
      },
      boxShadow: {
        card:   '0 1px 0 rgba(255,255,255,0.55) inset, 0 24px 50px -28px rgba(20,24,30,0.28)',
        item:   '0 2px 8px -4px rgba(0,0,0,0.05)',
        nav:    '0 8px 24px -8px rgba(0,0,0,0.10)',
        action: '0 4px 12px -4px rgba(0,0,0,0.10)',
      },
      letterSpacing: {
        tightest: '-0.025em',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Sanity-build**

Run:
```bash
npx next build
```
Expected: build succeeds with no Tailwind errors.

- [ ] **Step 3: Commit tokens**

```bash
git add tailwind.config.ts
git commit -m "feat: add design tokens to Tailwind config

Mood gradients, category colors, radii, shadows, ink palette, Mona Sans.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Moods data module

**Files:**
- Create: `lib/moods.ts`
- Create: `__tests__/lib/moods.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/moods.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { MOODS, isMood, getMoodTokens } from '@/lib/moods';

describe('moods', () => {
  it('exposes the 10 moods in canonical order', () => {
    expect(MOODS).toEqual([
      'happy', 'joyful', 'annoyed', 'worried', 'dizzy',
      'sad', 'angry', 'love', 'sleepy', 'neutral',
    ]);
  });

  it('isMood narrows correctly', () => {
    expect(isMood('happy')).toBe(true);
    expect(isMood('nope')).toBe(false);
  });

  it('returns gradient tokens for every mood', () => {
    for (const m of MOODS) {
      const t = getMoodTokens(m);
      expect(t.cardFrom).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.cardTo).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL with `Cannot find module '@/lib/moods'`.

- [ ] **Step 3: Implement `lib/moods.ts`**

Create `lib/moods.ts`:
```ts
export const MOODS = [
  'happy', 'joyful', 'annoyed', 'worried', 'dizzy',
  'sad', 'angry', 'love', 'sleepy', 'neutral',
] as const;

export type Mood = (typeof MOODS)[number];

export function isMood(x: unknown): x is Mood {
  return typeof x === 'string' && (MOODS as readonly string[]).includes(x);
}

export interface MoodTokens {
  cardFrom: string;
  cardTo: string;
  bodyTop: string;
  bodyMid: string;
  bodyBottom: string;
  cheek?: string;        // some moods have peach cheeks
  cheekOpacity?: number;
  ink: '#1b1d1f';
  label: string;         // Spanish UI label
}

const T: Record<Mood, MoodTokens> = {
  happy:   { cardFrom: '#fff4d8', cardTo: '#ffd987', bodyTop: '#ffe4a8', bodyMid: '#fbc25a', bodyBottom: '#d88a1c', cheek: '#f29a72', cheekOpacity: 0.6,  ink: '#1b1d1f', label: 'Feliz' },
  joyful:  { cardFrom: '#d6f5ea', cardTo: '#8de2c9', bodyTop: '#b8f0dd', bodyMid: '#54c6a6', bodyBottom: '#218e72', cheek: '#1f7a63', cheekOpacity: 0.35, ink: '#1b1d1f', label: 'Pleno' },
  annoyed: { cardFrom: '#ece0ff', cardTo: '#c4a3ff', bodyTop: '#d6bfff', bodyMid: '#9577f0', bodyBottom: '#6244b6',                                  ink: '#1b1d1f', label: 'Molesto' },
  worried: { cardFrom: '#fff1d6', cardTo: '#ffd07a', bodyTop: '#ffe6b0', bodyMid: '#fac466', bodyBottom: '#cb8519',                                  ink: '#1b1d1f', label: 'Preocupado' },
  dizzy:   { cardFrom: '#ffe0e1', cardTo: '#ff9ca0', bodyTop: '#ffc4c6', bodyMid: '#f47179', bodyBottom: '#a13540',                                  ink: '#1b1d1f', label: 'Mareado' },
  sad:     { cardFrom: '#e3ecff', cardTo: '#a3bcff', bodyTop: '#c4d3ff', bodyMid: '#7891f0', bodyBottom: '#3e57bf',                                  ink: '#1b1d1f', label: 'Triste' },
  angry:   { cardFrom: '#ffdcdc', cardTo: '#ff7e7e', bodyTop: '#ffbbbb', bodyMid: '#ee5e5e', bodyBottom: '#982929',                                  ink: '#1b1d1f', label: 'Enfadado' },
  love:    { cardFrom: '#ffe2ec', cardTo: '#ffa3bc', bodyTop: '#ffd0db', bodyMid: '#ff80a0', bodyBottom: '#b6315a',                                  ink: '#1b1d1f', label: 'Enamorado' },
  sleepy:  { cardFrom: '#ece4ff', cardTo: '#b9a3e8', bodyTop: '#e0d2ff', bodyMid: '#a48be0', bodyBottom: '#5b449a',                                  ink: '#1b1d1f', label: 'Adormilado' },
  neutral: { cardFrom: '#f0eee9', cardTo: '#d6cfc1', bodyTop: '#f2eadb', bodyMid: '#cdbe9d', bodyBottom: '#7d6d4d',                                  ink: '#1b1d1f', label: 'Neutral' },
};

export function getMoodTokens(m: Mood): MoodTokens {
  return T[m];
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/moods.ts __tests__/lib/moods.test.ts
git commit -m "feat(moods): canonical mood list + per-mood tokens

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: MoodBlob animations CSS module

**Files:**
- Create: `components/mood/mood-blob.module.css`

Copy ALL keyframes from `docs/design-handoff/mood_characters/Mood Characters.html` into a CSS module. The handoff lists 21 named keyframes (`float`, `breathe`, `floor-pulse`, `float-happy`, `float-joy`, `eye-roll`, `sway`, `mouth-quiver`, `wobble`, `spin`, `droop`, `tear-fall`, `angry-shake`, `love-pulse`, `heart-thump`, `sparkle`, `heart-float`, `zee-rise`, `steam-rise`, `sweat-drip`, `pulse`).

- [ ] **Step 1: Read the handoff CSS block**

Run:
```bash
sed -n '1,400p' "docs/design-handoff/mood_characters/Mood Characters.html" | grep -n "@keyframes\|animation:" | head -60
```
This confirms the keyframe names you must port. The full handoff CSS block lives between `<style>` and `</style>` in the HTML file — copy ALL keyframes and animation utility classes verbatim.

- [ ] **Step 2: Create the module**

Create `components/mood/mood-blob.module.css` with the full content of the handoff `<style>` block, but:
- Remove rules that depend on the document body / page layout (e.g. `body { ... }`, `.grid { ... }`, `.card::before`, `.card::after`, `header { ... }`).
- Keep all `@keyframes` blocks.
- Keep `.blob`, `.stage`, `.floor`, `.ambient`, `.sparkle`, `.heart`, `.zee`, `.steam`, `.sweat`, `.tear`, `.eye-roll`, `.worry-mouth`, `.heart-eye`, `.spiral-l`, `.spiral-r`, and any `.m-<mood>` rules that bind animations to elements.
- Keep `@media (prefers-reduced-motion: reduce) { ... }` at the bottom that effectively sets `animation: none`.

If a rule is ambiguous, prefer to keep it.

- [ ] **Step 3: Sanity import**

Run:
```bash
node -e "require('fs').readFileSync('components/mood/mood-blob.module.css','utf8').length" 
```
Expected: an integer > 4000 (the module should be substantial).

- [ ] **Step 4: Commit**

```bash
mkdir -p components/mood
git add components/mood/mood-blob.module.css
git commit -m "feat(mood): import all blob keyframes from the handoff

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: MoodBlob component — exemplar (Happy) with test

**Files:**
- Create: `components/mood/MoodBlob.tsx`
- Create: `__tests__/components/mood/MoodBlob.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/mood/MoodBlob.test.tsx`:
```tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MoodBlob } from '@/components/mood/MoodBlob';
import { MOODS } from '@/lib/moods';

describe('MoodBlob', () => {
  it('renders an SVG with role=img and accessible name per mood', () => {
    for (const m of MOODS) {
      const { container, unmount } = render(<MoodBlob mood={m} size={120} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg!.getAttribute('role')).toBe('img');
      expect(svg!.getAttribute('aria-label')).toMatch(/.+/);
      unmount();
    }
  });

  it('namespaces gradient ids per instance to avoid collisions', () => {
    const { container } = render(
      <>
        <MoodBlob mood="happy" size={80} />
        <MoodBlob mood="happy" size={80} />
      </>
    );
    const ids = Array.from(container.querySelectorAll('linearGradient,radialGradient'))
      .map(g => g.getAttribute('id'));
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- MoodBlob`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Happy variant first, then the other 9 in the same file**

Create `components/mood/MoodBlob.tsx`:
```tsx
'use client';

import { useId } from 'react';
import clsx from 'clsx';
import styles from './mood-blob.module.css';
import { getMoodTokens, type Mood } from '@/lib/moods';

export interface MoodBlobProps {
  mood: Mood;
  size?: number;            // px
  animate?: boolean;        // default true
  withFloor?: boolean;      // default true
  withParticles?: boolean;  // default true
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
        animate && styles[`m-${mood}` as keyof typeof styles],
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
          <path d="M66 110 Q 80 90, 94 110"  fill="none" stroke={stroke} strokeWidth="6.5" strokeLinecap="round" />
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
        <g className={`eye-roll`}>
          <ellipse cx="78"  cy="112" rx="13" ry="8" fill="#ffffff" />
          <ellipse cx="142" cy="112" rx="13" ry="8" fill="#ffffff" />
          <path d="M65 108 L 91 108" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <path d="M129 108 L 155 108" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <circle cx="78"  cy="113" r="3" fill={stroke} />
          <circle cx="142" cy="113" r="3" fill={stroke} />
          <line x1="80" y1="140" x2="140" y2="140" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'worried':
      return (
        <>
          <path d="M65 96 Q 80 88, 96 96"  fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <path d="M124 96 Q 140 88, 156 96" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="82"  cy="116" rx="4" ry="5.5" fill={stroke} />
          <ellipse cx="138" cy="116" rx="4" ry="5.5" fill={stroke} />
          <path className={`worry-mouth`} d="M75 148 Q 88 140, 100 148 T 125 148 T 150 148" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case 'dizzy':
      return (
        <>
          <path className={`spiral-l`}
            d="M75 110 m -10 0 a 10 10 0 1 0 20 0 a 7 7 0 1 0 -14 0 a 4 4 0 1 0 8 0"
            fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path className={`spiral-r`}
            d="M145 110 m -10 0 a 10 10 0 1 0 20 0 a 7 7 0 1 0 -14 0 a 4 4 0 1 0 8 0"
            fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="148" x2="140" y2="148" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case 'sad':
      return (
        <>
          <path d="M65 96 Q 80 88, 96 96"   fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <path d="M124 96 Q 140 88, 156 96" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <path d="M70 118 Q 82 128, 94 118" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <path d="M126 118 Q 138 128, 150 118" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <path d="M70 162 Q 110 138, 150 162" fill="none" stroke={stroke} strokeWidth="6.5" strokeLinecap="round" />
          <path className={`tear`} d="M90 130 q -4 8 0 14 q 4 -6 0 -14 z" fill="#7aaaff" />
        </>
      );
    case 'angry':
      return (
        <>
          <path d="M62 92 L 96 102"  stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <path d="M158 92 L 124 102" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="84"  cy="118" rx="4" ry="5" fill={stroke} />
          <ellipse cx="136" cy="118" rx="4" ry="5" fill={stroke} />
          <path d="M76 152 Q 110 134, 144 152" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        </>
      );
    case 'love':
      return (
        <>
          <path className={`heart-eye`}
            d="M75 110 c -6 -8 -18 -6 -18 4 c 0 8 18 16 18 16 c 0 0 18 -8 18 -16 c 0 -10 -12 -12 -18 -4 z"
            fill="#e23a5a" />
          <path className={`heart-eye`}
            d="M145 110 c -6 -8 -18 -6 -18 4 c 0 8 18 16 18 16 c 0 0 18 -8 18 -16 c 0 -10 -12 -12 -18 -4 z"
            fill="#e23a5a" />
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
          <i className={styles.steam} style={{ top: '6%', left:  '34%', animationDelay: '0s'   }} />
          <i className={styles.steam} style={{ top: '6%', left:  '50%', animationDelay: '0.5s' }} />
          <i className={styles.steam} style={{ top: '6%', left:  '66%', animationDelay: '1s'   }} />
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
```

If the CSS module class names you copied in Task 8 differ from `stage`, `floor`, `blob`, `ambient`, `sparkle`, `sweat`, `steam`, `heart`, `zee`, `m-<mood>`, `eye-roll`, `worry-mouth`, `spiral-l`, `spiral-r`, `heart-eye`, `tear`, adjust either the module or this component so the references line up. Prefer matching the handoff names; rename here if needed.

- [ ] **Step 4: Run tests**

Run: `npm test -- MoodBlob`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add components/mood/MoodBlob.tsx __tests__/components/mood/MoodBlob.test.tsx
git commit -m "feat(mood): MoodBlob with 10 mood variants and namespaced gradients

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: MoodGradientBg

**Files:**
- Create: `components/mood/MoodGradientBg.tsx`
- Create: `__tests__/components/mood/MoodGradientBg.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/mood/MoodGradientBg.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MoodGradientBg } from '@/components/mood/MoodGradientBg';

describe('MoodGradientBg', () => {
  it('applies a 170deg linear-gradient styled to the mood', () => {
    render(
      <MoodGradientBg mood="happy" data-testid="bg">
        <span>child</span>
      </MoodGradientBg>
    );
    const el = screen.getByTestId('bg');
    expect(el).toHaveStyle({ backgroundImage: expect.stringContaining('linear-gradient(170deg') } as never);
    expect(el.textContent).toBe('child');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- MoodGradientBg`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/mood/MoodGradientBg.tsx`:
```tsx
'use client';

import clsx from 'clsx';
import { getMoodTokens, type Mood } from '@/lib/moods';

export interface MoodGradientBgProps extends React.HTMLAttributes<HTMLDivElement> {
  mood: Mood;
  children: React.ReactNode;
}

export function MoodGradientBg({ mood, children, className, style, ...rest }: MoodGradientBgProps) {
  const t = getMoodTokens(mood);
  return (
    <div
      {...rest}
      className={clsx('min-h-dvh w-full transition-[background-image] duration-300', className)}
      style={{
        backgroundImage: `linear-gradient(170deg, ${t.cardFrom} 0%, ${t.cardTo} 100%)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- MoodGradientBg`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/mood/MoodGradientBg.tsx __tests__/components/mood/MoodGradientBg.test.tsx
git commit -m "feat(mood): MoodGradientBg full-screen 170deg gradient wrapper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Global save-state store + InlineSaveText

**Files:**
- Create: `lib/save-state.ts`
- Create: `components/feedback/InlineSaveText.tsx`
- Create: `__tests__/components/feedback/InlineSaveText.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/feedback/InlineSaveText.test.tsx`:
```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { saveState } from '@/lib/save-state';

describe('InlineSaveText', () => {
  it('renders saving and saved labels reactively', () => {
    render(<InlineSaveText />);
    expect(screen.queryByText(/Guardando|Guardado|Error/)).toBeNull();

    act(() => { saveState.getState().set('saving'); });
    expect(screen.getByText('Guardando…')).toBeInTheDocument();

    act(() => { saveState.getState().set('saved'); });
    expect(screen.getByText('Guardado')).toBeInTheDocument();

    act(() => { saveState.getState().set('error', 'Reintentar'); });
    expect(screen.getByText(/Error/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- InlineSaveText`
Expected: module not found.

- [ ] **Step 3: Implement the store**

Create `lib/save-state.ts`:
```ts
import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveState {
  status: SaveStatus;
  message?: string;
  set: (s: SaveStatus, m?: string) => void;
}

export const saveState = create<SaveState>((set) => ({
  status: 'idle',
  set: (status, message) => set({ status, message }),
}));
```

- [ ] **Step 4: Implement the component**

Create `components/feedback/InlineSaveText.tsx`:
```tsx
'use client';

import { Check } from 'lucide-react';
import { useEffect } from 'react';
import { saveState } from '@/lib/save-state';

export function InlineSaveText() {
  const status  = saveState((s) => s.status);
  const message = saveState((s) => s.message);

  useEffect(() => {
    if (status !== 'saved') return;
    const t = setTimeout(() => saveState.getState().set('idle'), 1500);
    return () => clearTimeout(t);
  }, [status]);

  if (status === 'idle') return null;

  if (status === 'saving') {
    return <p className="text-xs text-ink-muted">Guardando…</p>;
  }
  if (status === 'saved') {
    return (
      <p className="flex items-center gap-1 text-xs text-ink-muted">
        Guardado <Check size={12} aria-hidden />
      </p>
    );
  }
  return (
    <p className="text-xs text-danger">
      Error al guardar{message ? ` · ${message}` : ''}
    </p>
  );
}
```

- [ ] **Step 5: Run tests + commit**

Run: `npm test -- InlineSaveText`
Expected: PASS.

Commit:
```bash
git add lib/save-state.ts components/feedback/InlineSaveText.tsx __tests__/components/feedback/InlineSaveText.test.tsx
git commit -m "feat(feedback): global save-state store + InlineSaveText

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: HeaderActionButton

**Files:**
- Create: `components/nav/HeaderActionButton.tsx`
- Create: `__tests__/components/nav/HeaderActionButton.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/nav/HeaderActionButton.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Bell } from 'lucide-react';
import { describe, it, expect, vi } from 'vitest';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';

describe('HeaderActionButton', () => {
  it('renders an accessible button with the given icon and label', () => {
    render(<HeaderActionButton icon={Bell} label="Notificaciones" />);
    const btn = screen.getByRole('button', { name: 'Notificaciones' });
    expect(btn.querySelector('svg')).not.toBeNull();
  });

  it('shows a dot when dot=true', () => {
    render(<HeaderActionButton icon={Bell} label="Notificaciones" dot />);
    expect(screen.getByTestId('header-action-dot')).toBeInTheDocument();
  });

  it('calls onClick', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<HeaderActionButton icon={Bell} label="x" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- HeaderActionButton`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/nav/HeaderActionButton.tsx`:
```tsx
'use client';

import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export interface HeaderActionButtonProps {
  icon: LucideIcon;
  label: string;
  dot?: boolean;
  onClick?: () => void;
  className?: string;
}

export function HeaderActionButton({ icon: Icon, label, dot, onClick, className }: HeaderActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        'relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action',
        'transition-transform duration-150 active:scale-95',
        className
      )}
    >
      <Icon size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
      {dot && (
        <span
          data-testid="header-action-dot"
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger"
          aria-hidden
        />
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- HeaderActionButton`
Expected: 3 passing.

```bash
git add components/nav/HeaderActionButton.tsx __tests__/components/nav/HeaderActionButton.test.tsx
git commit -m "feat(nav): HeaderActionButton with optional notification dot

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: SegmentedDayWeekMonth

**Files:**
- Create: `components/controls/SegmentedDayWeekMonth.tsx`
- Create: `__tests__/components/controls/SegmentedDayWeekMonth.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/controls/SegmentedDayWeekMonth.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SegmentedDayWeekMonth } from '@/components/controls/SegmentedDayWeekMonth';

describe('SegmentedDayWeekMonth', () => {
  it('renders 3 options and marks the active one', () => {
    render(<SegmentedDayWeekMonth value="week" onChange={() => {}} />);
    const week = screen.getByRole('radio', { name: 'Semana' });
    expect(week).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when a different option is tapped', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SegmentedDayWeekMonth value="week" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Día' }));
    expect(onChange).toHaveBeenCalledWith('day');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- SegmentedDayWeekMonth`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/controls/SegmentedDayWeekMonth.tsx`:
```tsx
'use client';

import clsx from 'clsx';

export type Range = 'day' | 'week' | 'month';

const OPTIONS: { value: Range; label: string }[] = [
  { value: 'day',   label: 'Día' },
  { value: 'week',  label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

export interface SegmentedDayWeekMonthProps {
  value: Range;
  onChange: (v: Range) => void;
  className?: string;
}

export function SegmentedDayWeekMonth({ value, onChange, className }: SegmentedDayWeekMonthProps) {
  const activeIndex = OPTIONS.findIndex((o) => o.value === value);

  return (
    <div
      role="radiogroup"
      aria-label="Rango"
      className={clsx(
        'relative grid grid-cols-3 rounded-full bg-white p-1.5 shadow-action',
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/3)] rounded-full bg-ink transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'relative z-10 py-2 text-sm font-medium transition-colors',
              active ? 'text-white font-bold' : 'text-ink-muted'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- SegmentedDayWeekMonth`
Expected: 2 passing.

```bash
git add components/controls/SegmentedDayWeekMonth.tsx __tests__/components/controls/SegmentedDayWeekMonth.test.tsx
git commit -m "feat(controls): SegmentedDayWeekMonth with sliding active indicator

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: BottomNav

**Files:**
- Create: `components/nav/BottomNav.tsx`
- Create: `__tests__/components/nav/BottomNav.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/nav/BottomNav.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BottomNav } from '@/components/nav/BottomNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
}));

describe('BottomNav', () => {
  it('renders 5 nav items with accessible labels', () => {
    render(<BottomNav />);
    for (const name of ['Inicio', 'Training', 'Comidas', 'Gastos', 'Perfil']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
  });

  it('marks the active route', () => {
    render(<BottomNav />);
    const home = screen.getByRole('link', { name: 'Inicio' });
    expect(home).toHaveAttribute('aria-current', 'page');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- BottomNav`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/nav/BottomNav.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, ChefHat, Wallet, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { href: '/home',     label: 'Inicio',   icon: Home     },
  { href: '/training', label: 'Training', icon: Dumbbell },
  { href: '/meals',    label: 'Comidas',  icon: ChefHat  },
  { href: '/expenses', label: 'Gastos',   icon: Wallet   },
  { href: '/profile',  label: 'Perfil',   icon: User     },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom,16px)]"
    >
      <div className="mx-4 mb-2 flex w-full max-w-md justify-around gap-1 rounded-full bg-white/85 px-3 py-2 shadow-nav backdrop-blur">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={clsx(
                'flex h-14 w-14 flex-col items-center justify-center rounded-full transition-transform duration-150 active:scale-95',
                active ? 'text-ink' : 'text-ink-muted'
              )}
            >
              <Icon size={22} strokeWidth={1.5} aria-hidden />
              {active && <span className="mt-1 text-[11px] font-medium leading-none">{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- BottomNav`
Expected: 2 passing.

```bash
git add components/nav/BottomNav.tsx __tests__/components/nav/BottomNav.test.tsx
git commit -m "feat(nav): BottomNav floating pill with 5 tabs and active state

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Supabase clients

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Write the browser client**

Create `lib/supabase/client.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function supabaseClient(): SupabaseClient {
  if (_client) return _client;
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  _client = createClient(url, anon, { auth: { persistSession: false } });
  return _client;
}
```

- [ ] **Step 2: Write the server factory**

Create `lib/supabase/server.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function supabaseServer(): SupabaseClient {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Missing Supabase env on the server');
  }
  return createClient(url, anon, { auth: { persistSession: false } });
}
```

- [ ] **Step 3: Document env**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=https://jxyqbtttgpdokotmbeud.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<set me>
ANTHROPIC_API_KEY=<server-only, not used in this plan>
```

Then create the real `.env.local` from the example. Get the anon key from the legacy file:
```bash
grep "SUPA_KEY" legacy/index.html
```
Copy the value into `.env.local` (do NOT commit `.env.local`, the scaffold's `.gitignore` already ignores it — verify with `git check-ignore -v .env.local`).

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts .env.local.example
git commit -m "feat(supabase): browser and server client factories + env example

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: `mood_logs` migration + apply

**Files:**
- Create: `supabase/migrations/20260528120000_mood_logs.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260528120000_mood_logs.sql`:
```sql
create table if not exists mood_logs (
  id uuid primary key default gen_random_uuid(),
  athlete text not null check (athlete in ('MK','Xabi')),
  date date not null,
  mood text not null check (mood in (
    'happy','joyful','annoyed','worried','dizzy',
    'sad','angry','love','sleepy','neutral'
  )),
  note text,
  created_at timestamptz not null default now(),
  unique (athlete, date)
);

create index if not exists mood_logs_athlete_date_idx
  on mood_logs (athlete, date desc);

alter table mood_logs enable row level security;

drop policy if exists "open mood_logs" on mood_logs;
create policy "open mood_logs" on mood_logs for all using (true) with check (true);
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with:
- `project_id`: lookup with `mcp__claude_ai_Supabase__list_projects` and pick `jxyqbtttgpdokotmbeud`.
- `name`: `mood_logs`
- `query`: the SQL above.

Verify with `mcp__claude_ai_Supabase__list_tables` that `mood_logs` is present.

If the MCP is unavailable, paste the SQL into the Supabase SQL editor manually and confirm success.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260528120000_mood_logs.sql
git commit -m "feat(db): mood_logs migration (athlete, date, mood, note)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Date helpers

**Files:**
- Create: `lib/date.ts`
- Create: `__tests__/lib/date.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/date.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { todayISO, startOfWeekISO, weekDays } from '@/lib/date';

describe('date helpers', () => {
  it('todayISO returns YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('startOfWeekISO returns the Monday of a given date (Sun→prev Monday)', () => {
    expect(startOfWeekISO(new Date('2026-05-13T10:00:00Z'))).toBe('2026-05-11'); // Wed → Mon
    expect(startOfWeekISO(new Date('2026-05-11T10:00:00Z'))).toBe('2026-05-11'); // Mon → Mon
    expect(startOfWeekISO(new Date('2026-05-17T10:00:00Z'))).toBe('2026-05-11'); // Sun → Mon prev
  });

  it('weekDays returns 7 ISO dates starting Monday', () => {
    expect(weekDays('2026-05-11')).toEqual([
      '2026-05-11','2026-05-12','2026-05-13','2026-05-14',
      '2026-05-15','2026-05-16','2026-05-17',
    ]);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- date`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `lib/date.ts`:
```ts
export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}

export function startOfWeekISO(d: Date): string {
  // Monday = 1, Sunday = 0 → diff to subtract to get to Monday
  const day = d.getUTCDay();          // 0..6 (UTC)
  const diff = (day + 6) % 7;          // Mon→0, Tue→1, ... Sun→6
  const monday = new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff
  ));
  return toISO(monday);
}

export function weekDays(startISO: string): string[] {
  const [y, m, d] = startISO.split('-').map(Number);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(Date.UTC(y, m - 1, d + i));
    out.push(toISO(dd));
  }
  return out;
}

function toISO(d: Date): string {
  const y  = d.getUTCFullYear();
  const m  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- date`
Expected: 3 passing.

```bash
git add lib/date.ts __tests__/lib/date.test.ts
git commit -m "feat(lib): date helpers (todayISO, startOfWeekISO, weekDays)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: Athlete context

**Files:**
- Create: `lib/athlete-context.tsx`
- Create: `__tests__/lib/athlete-context.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/athlete-context.test.tsx`:
```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AthleteProvider, useAthlete, setAthlete } from '@/lib/athlete-context';

function Probe() {
  const a = useAthlete();
  return <p>athlete:{a ?? 'none'}</p>;
}

describe('athlete context', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts null, then reads from localStorage and writes back on setAthlete', () => {
    window.localStorage.setItem('mkxa.athlete', 'MK');
    render(<AthleteProvider><Probe /></AthleteProvider>);
    expect(screen.getByText('athlete:MK')).toBeInTheDocument();

    act(() => { setAthlete('Xabi'); });
    expect(screen.getByText('athlete:Xabi')).toBeInTheDocument();
    expect(window.localStorage.getItem('mkxa.athlete')).toBe('Xabi');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- athlete-context`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `lib/athlete-context.tsx`:
```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { create } from 'zustand';

export type Athlete = 'MK' | 'Xabi';

const STORE_KEY = 'mkxa.athlete';

interface AthleteStore {
  athlete: Athlete | null;
  setAthlete: (a: Athlete | null) => void;
}

export const athleteStore = create<AthleteStore>((set) => ({
  athlete: null,
  setAthlete: (a) => {
    if (typeof window !== 'undefined') {
      if (a === null) window.localStorage.removeItem(STORE_KEY);
      else window.localStorage.setItem(STORE_KEY, a);
    }
    set({ athlete: a });
  },
}));

const AthleteCtx = createContext<Athlete | null>(null);

export function AthleteProvider({ children }: { children: React.ReactNode }) {
  const athlete = athleteStore((s) => s.athlete);
  const set     = athleteStore((s) => s.setAthlete);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    const stored = window.localStorage.getItem(STORE_KEY);
    if (stored === 'MK' || stored === 'Xabi') set(stored);
    setHydrated(true);
  }, [hydrated, set]);

  return <AthleteCtx.Provider value={athlete}>{children}</AthleteCtx.Provider>;
}

export function useAthlete(): Athlete | null {
  return useContext(AthleteCtx);
}

export function setAthlete(a: Athlete | null) {
  athleteStore.getState().setAthlete(a);
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- athlete-context`
Expected: PASS.

```bash
git add lib/athlete-context.tsx __tests__/lib/athlete-context.test.tsx
git commit -m "feat(lib): athlete context + zustand store with localStorage persistence

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: useMoodToday hook

**Files:**
- Create: `lib/hooks/use-mood-today.ts`
- Create: `__tests__/lib/hooks/use-mood-today.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/hooks/use-mood-today.test.tsx`:
```tsx
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMoodToday } from '@/lib/hooks/use-mood-today';

const maybeSingle = vi.fn();
const eq2 = vi.fn(() => ({ maybeSingle }));
const eq1 = vi.fn(() => ({ eq: eq2 }));
const select = vi.fn(() => ({ eq: eq1 }));
const upsert  = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({
    from: () => ({ select, upsert }),
  }),
}));

function Probe() {
  const { mood, save, loading } = useMoodToday('MK');
  return (
    <>
      <p>loading:{String(loading)}</p>
      <p>mood:{mood?.mood ?? 'none'}</p>
      <button onClick={() => save('joyful')}>save</button>
    </>
  );
}

describe('useMoodToday', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('loads null when no row exists', async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('mood:none')).toBeInTheDocument();
  });

  it('save upserts and updates local state', async () => {
    upsert.mockReturnValueOnce(Promise.resolve({ error: null }));
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    await act(async () => {
      screen.getByText('save').click();
    });
    expect(upsert).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- use-mood-today`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `lib/hooks/use-mood-today.ts`:
```ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import { todayISO } from '@/lib/date';
import type { Mood } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

export interface MoodLog {
  athlete: Athlete;
  date: string;
  mood: Mood;
  note: string | null;
}

export function useMoodToday(athlete: Athlete | null) {
  const [mood, setMood] = useState<MoodLog | null>(null);
  const [loading, setLoading] = useState<boolean>(athlete !== null);

  useEffect(() => {
    if (!athlete) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const date = todayISO();
      const { data, error } = await supabaseClient()
        .from('mood_logs')
        .select('athlete,date,mood,note')
        .eq('athlete', athlete)
        .eq('date', date)
        .maybeSingle();
      if (cancelled) return;
      if (error) { saveState.getState().set('error'); setLoading(false); return; }
      setMood(data as MoodLog | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete]);

  const save = useCallback(async (m: Mood, note?: string) => {
    if (!athlete) return;
    const date = todayISO();
    saveState.getState().set('saving');
    const { error } = await supabaseClient().from('mood_logs').upsert({
      athlete, date, mood: m, note: note ?? null,
    }, { onConflict: 'athlete,date' });
    if (error) { saveState.getState().set('error'); return; }
    saveState.getState().set('saved');
    setMood({ athlete, date, mood: m, note: note ?? null });
  }, [athlete]);

  return { mood, loading, save };
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- use-mood-today`
Expected: PASS.

```bash
git add lib/hooks/use-mood-today.ts __tests__/lib/hooks/use-mood-today.test.tsx
git commit -m "feat(hooks): useMoodToday — read/upsert mood_logs for athlete+today

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: MoodTokenStrip

**Files:**
- Create: `components/mood/MoodTokenStrip.tsx`
- Create: `__tests__/components/mood/MoodTokenStrip.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/mood/MoodTokenStrip.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MoodTokenStrip } from '@/components/mood/MoodTokenStrip';

describe('MoodTokenStrip', () => {
  it('renders 10 mood tokens', () => {
    render(<MoodTokenStrip value="happy" onChange={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(10);
  });

  it('reports the selected mood', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MoodTokenStrip value="happy" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: /Triste/ }));
    expect(onChange).toHaveBeenCalledWith('sad');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- MoodTokenStrip`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/mood/MoodTokenStrip.tsx`:
```tsx
'use client';

import clsx from 'clsx';
import { MoodBlob } from './MoodBlob';
import { MOODS, getMoodTokens, type Mood } from '@/lib/moods';

export interface MoodTokenStripProps {
  value: Mood;
  onChange: (m: Mood) => void;
  className?: string;
}

export function MoodTokenStrip({ value, onChange, className }: MoodTokenStripProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Estado de ánimo"
      className={clsx(
        'flex w-full snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      {MOODS.map((m) => {
        const active = m === value;
        const label  = getMoodTokens(m).label;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => onChange(m)}
            className={clsx(
              'flex w-[88px] shrink-0 snap-center flex-col items-center gap-2 rounded-2xl p-1 transition-all',
              active ? 'scale-105 opacity-100' : 'opacity-50'
            )}
          >
            <MoodBlob mood={m} size={72} animate={active} withFloor={false} withParticles={false} />
            <span className="text-[13px] font-medium text-ink">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- MoodTokenStrip`
Expected: 2 passing.

```bash
git add components/mood/MoodTokenStrip.tsx __tests__/components/mood/MoodTokenStrip.test.tsx
git commit -m "feat(mood): MoodTokenStrip horizontal scrollable mood picker

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 21: WaveDecoration

**Files:**
- Create: `components/mood/WaveDecoration.tsx`

- [ ] **Step 1: Implement (no test — pure decorative)**

Create `components/mood/WaveDecoration.tsx`:
```tsx
export function WaveDecoration({ className }: { className?: string }) {
  // 32 vertical bars, heights modulated by a sine wave, color: low-contrast ink.
  const bars = Array.from({ length: 32 }, (_, i) => {
    const h = 12 + Math.sin((i / 32) * Math.PI * 4) * 18 + (i % 3) * 4;
    return { i, h };
  });
  return (
    <svg
      viewBox="0 0 320 60"
      preserveAspectRatio="none"
      aria-hidden
      className={className}
    >
      {bars.map(({ i, h }) => (
        <rect
          key={i}
          x={i * 10 + 1}
          y={30 - h / 2}
          width={4}
          height={h}
          rx={2}
          fill="rgba(27,29,31,0.12)"
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/mood/WaveDecoration.tsx
git commit -m "feat(mood): WaveDecoration static SVG audio-wave

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 22: MoodCheckIn screen

**Files:**
- Create: `components/mood/MoodCheckIn.tsx`
- Create: `__tests__/components/mood/MoodCheckIn.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/mood/MoodCheckIn.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MoodCheckIn } from '@/components/mood/MoodCheckIn';

describe('MoodCheckIn', () => {
  it('renders the question header and a 10-token picker', () => {
    render(<MoodCheckIn onConfirm={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Cómo estás/i);
    expect(screen.getAllByRole('radio')).toHaveLength(10);
  });

  it('changing selection updates the hero label', async () => {
    const user = userEvent.setup();
    render(<MoodCheckIn onConfirm={() => {}} />);
    await user.click(screen.getByRole('radio', { name: 'Triste' }));
    expect(screen.getByTestId('mood-checkin-label')).toHaveTextContent('Triste');
  });

  it('calls onConfirm with the selected mood', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<MoodCheckIn onConfirm={onConfirm} />);
    await user.click(screen.getByRole('radio', { name: 'Pleno' }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledWith('joyful');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- MoodCheckIn`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/mood/MoodCheckIn.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { MoodBlob } from './MoodBlob';
import { MoodGradientBg } from './MoodGradientBg';
import { MoodTokenStrip } from './MoodTokenStrip';
import { WaveDecoration } from './WaveDecoration';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';
import { getMoodTokens, type Mood } from '@/lib/moods';

export interface MoodCheckInProps {
  initial?: Mood;
  onConfirm: (m: Mood) => void;
}

export function MoodCheckIn({ initial = 'happy', onConfirm }: MoodCheckInProps) {
  const [mood, setMood] = useState<Mood>(initial);
  const label = getMoodTokens(mood).label;

  return (
    <MoodGradientBg mood={mood} className="flex flex-col">
      <header
        className="flex items-start justify-between px-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <span aria-hidden className="h-10 w-10" />
        <HeaderActionButton
          icon={Check}
          label="Confirmar"
          onClick={() => onConfirm(mood)}
        />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="font-sans text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink">
          ¿Cómo estás<br />realmente hoy?
        </h1>

        <div className="flex-1 flex items-center justify-center">
          <MoodBlob mood={mood} size={280} animate withFloor withParticles />
        </div>

        <WaveDecoration className="h-12 w-full max-w-[360px]" />
      </section>

      <footer
        className="flex flex-col items-center gap-2 px-2 pb-8"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <MoodTokenStrip value={mood} onChange={setMood} />
        <p data-testid="mood-checkin-label" className="text-base font-bold text-ink">
          {label}
        </p>
      </footer>
    </MoodGradientBg>
  );
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- MoodCheckIn`
Expected: 3 passing.

```bash
git add components/mood/MoodCheckIn.tsx __tests__/components/mood/MoodCheckIn.test.tsx
git commit -m "feat(mood): MoodCheckIn full-screen daily mood selector

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 23: MoodGate

**Files:**
- Create: `components/mood/MoodGate.tsx`
- Create: `__tests__/components/mood/MoodGate.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/mood/MoodGate.test.tsx`:
```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoodGate } from '@/components/mood/MoodGate';

const useMoodTodayMock = vi.fn();
vi.mock('@/lib/hooks/use-mood-today', () => ({
  useMoodToday: (a: any) => useMoodTodayMock(a),
}));

vi.mock('@/lib/athlete-context', () => ({
  useAthlete: () => 'MK',
}));

describe('MoodGate', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows nothing while loading', () => {
    useMoodTodayMock.mockReturnValue({ mood: null, loading: true, save: vi.fn() });
    render(<MoodGate><p>child</p></MoodGate>);
    expect(screen.queryByText('child')).toBeNull();
  });

  it('shows MoodCheckIn when no mood today', () => {
    useMoodTodayMock.mockReturnValue({ mood: null, loading: false, save: vi.fn() });
    render(<MoodGate><p>child</p></MoodGate>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Cómo estás/);
    expect(screen.queryByText('child')).toBeNull();
  });

  it('renders children inside MoodGradientBg when mood exists', () => {
    useMoodTodayMock.mockReturnValue({
      mood: { athlete: 'MK', date: '2026-05-28', mood: 'joyful', note: null },
      loading: false,
      save: vi.fn(),
    });
    render(<MoodGate><p>child</p></MoodGate>);
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- MoodGate`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/mood/MoodGate.tsx`:
```tsx
'use client';

import { MoodCheckIn } from './MoodCheckIn';
import { MoodGradientBg } from './MoodGradientBg';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodToday } from '@/lib/hooks/use-mood-today';

export function MoodGate({ children }: { children: React.ReactNode }) {
  const athlete = useAthlete();
  const { mood, loading, save } = useMoodToday(athlete);

  if (loading) {
    return <div className="min-h-dvh bg-white" aria-hidden />;
  }

  if (!mood) {
    return <MoodCheckIn onConfirm={(m) => save(m)} />;
  }

  return (
    <MoodGradientBg mood={mood.mood}>
      {children}
    </MoodGradientBg>
  );
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- MoodGate`
Expected: 3 passing.

```bash
git add components/mood/MoodGate.tsx __tests__/components/mood/MoodGate.test.tsx
git commit -m "feat(mood): MoodGate enforces daily check-in before children

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 24: Athlete picker page

**Files:**
- Create: `app/pick/page.tsx`

- [ ] **Step 1: Implement (visual page, no test — relies on athlete-context tests)**

Create `app/pick/page.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { MoodBlob } from '@/components/mood/MoodBlob';
import { setAthlete, type Athlete } from '@/lib/athlete-context';

export default function PickPage() {
  const router = useRouter();
  const pick = (a: Athlete) => {
    setAthlete(a);
    router.push('/home');
  };

  return (
    <main
      className="min-h-dvh w-full bg-neutral-50 flex flex-col items-center justify-center gap-10 px-6"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <h1 className="font-sans text-[40px] font-extrabold tracking-tightest text-ink text-center">
        ¿Quién entra?
      </h1>

      <div className="flex w-full max-w-md flex-col gap-4">
        <button
          type="button"
          onClick={() => pick('MK')}
          aria-label="Entrar como MK"
          className="flex items-center justify-between rounded-card bg-white p-5 shadow-card transition-transform duration-150 active:scale-95"
        >
          <span className="font-sans text-3xl font-extrabold tracking-tight text-ink">MK</span>
          <MoodBlob mood="love" size={64} withFloor={false} withParticles={false} />
        </button>

        <button
          type="button"
          onClick={() => pick('Xabi')}
          aria-label="Entrar como Xabi"
          className="flex items-center justify-between rounded-card bg-white p-5 shadow-card transition-transform duration-150 active:scale-95"
        >
          <span className="font-sans text-3xl font-extrabold tracking-tight text-ink">Xabi</span>
          <MoodBlob mood="joyful" size={64} withFloor={false} withParticles={false} />
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/pick/page.tsx
git commit -m "feat(pick): athlete picker page (MK / Xabi)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 25: Root redirect + AthleteProvider wiring

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update root layout to wrap children with AthleteProvider**

Replace contents of `app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AthleteProvider } from '@/lib/athlete-context';

const monaSans = localFont({
  src: [
    { path: '../public/fonts/MonaSans-Regular.woff2',   weight: '400', style: 'normal' },
    { path: '../public/fonts/MonaSans-Medium.woff2',    weight: '500', style: 'normal' },
    { path: '../public/fonts/MonaSans-Bold.woff2',      weight: '700', style: 'normal' },
    { path: '../public/fonts/MonaSans-ExtraBold.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-mona',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MKXA',
  description: 'Daily life app for MK and Xabi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={monaSans.variable}>
      <body className="font-sans antialiased">
        <AthleteProvider>{children}</AthleteProvider>
      </body>
    </html>
  );
}
```
(If you used the variable font in Task 5, keep that single-entry `src` array.)

- [ ] **Step 2: Root redirect logic**

Replace contents of `app/page.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAthlete } from '@/lib/athlete-context';

export default function RootPage() {
  const router = useRouter();
  const athlete = useAthlete();

  useEffect(() => {
    router.replace(athlete ? '/home' : '/pick');
  }, [athlete, router]);

  return null;
}
```

- [ ] **Step 3: Smoke build**

Run:
```bash
npx next build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat(root): wrap with AthleteProvider, redirect / based on selection

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 26: `(app)` shell layout with MoodGate + BottomNav

**Files:**
- Create: `app/(app)/layout.tsx`

- [ ] **Step 1: Implement**

Create `app/(app)/layout.tsx`:
```tsx
import { MoodGate } from '@/components/mood/MoodGate';
import { BottomNav } from '@/components/nav/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MoodGate>
      <div className="min-h-dvh pb-28">{children}</div>
      <BottomNav />
    </MoodGate>
  );
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p "app/(app)"
git add "app/(app)/layout.tsx"
git commit -m "feat(app): shell layout with MoodGate and BottomNav

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 27: GreetingHeader

**Files:**
- Create: `components/home/GreetingHeader.tsx`
- Create: `__tests__/components/home/GreetingHeader.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/home/GreetingHeader.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GreetingHeader } from '@/components/home/GreetingHeader';

describe('GreetingHeader', () => {
  it('shows Buenos días for morning hours', () => {
    const at = new Date('2026-05-28T08:00:00');
    render(<GreetingHeader athlete="MK" now={at} todayMood="joyful" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Buenos días, MK/);
  });

  it('shows Buenas tardes for afternoon hours', () => {
    const at = new Date('2026-05-28T17:00:00');
    render(<GreetingHeader athlete="Xabi" now={at} todayMood="happy" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Buenas tardes, Xabi/);
  });

  it('shows the logged mood label as subtitle', () => {
    render(<GreetingHeader athlete="MK" now={new Date('2026-05-28T10:00:00')} todayMood="sleepy" />);
    expect(screen.getByText(/Adormilado/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- GreetingHeader`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/home/GreetingHeader.tsx`:
```tsx
import { Bell } from 'lucide-react';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';
import { getMoodTokens, type Mood } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

export interface GreetingHeaderProps {
  athlete: Athlete;
  now?: Date;
  todayMood: Mood;
}

export function GreetingHeader({ athlete, now = new Date(), todayMood }: GreetingHeaderProps) {
  const h = now.getHours();
  const part =
    h < 12 ? 'Buenos días' :
    h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const moodLabel = getMoodTokens(todayMood).label;

  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-6">
      <div>
        <h1 className="font-sans text-[36px] font-extrabold leading-[1.05] tracking-tightest text-ink">
          {part}, {athlete},<br />¿qué tal hoy?
        </h1>
        <p className="mt-2 text-[13px] text-ink-muted">
          Has registrado: <span className="font-medium text-ink">{moodLabel}</span>
        </p>
      </div>
      <HeaderActionButton icon={Bell} label="Notificaciones" dot />
    </header>
  );
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- GreetingHeader`
Expected: 3 passing.

```bash
git add components/home/GreetingHeader.tsx __tests__/components/home/GreetingHeader.test.tsx
git commit -m "feat(home): GreetingHeader time-aware + mood subtitle + bell

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 28: WeekMoodDotsRow

**Files:**
- Create: `components/home/WeekMoodDotsRow.tsx`
- Create: `__tests__/components/home/WeekMoodDotsRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/home/WeekMoodDotsRow.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WeekMoodDotsRow } from '@/components/home/WeekMoodDotsRow';

describe('WeekMoodDotsRow', () => {
  it('renders 7 day cells with the weekday labels', () => {
    render(<WeekMoodDotsRow weekStartISO="2026-05-11" todayISO="2026-05-13" logsByDate={{}} />);
    for (const label of ['L','M','X','J','V','S','D']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('marks today with an outer ring', () => {
    render(<WeekMoodDotsRow weekStartISO="2026-05-11" todayISO="2026-05-13" logsByDate={{}} />);
    const cell = screen.getByTestId('day-cell-2026-05-13');
    expect(cell.className).toMatch(/ring|outline/);
  });

  it('fills the cell with the mood color when a log exists', () => {
    render(
      <WeekMoodDotsRow
        weekStartISO="2026-05-11"
        todayISO="2026-05-13"
        logsByDate={{ '2026-05-11': 'happy' }}
      />
    );
    const filled = screen.getByTestId('day-cell-2026-05-11');
    expect(filled.style.backgroundColor).not.toBe('');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- WeekMoodDotsRow`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/home/WeekMoodDotsRow.tsx`:
```tsx
import clsx from 'clsx';
import { weekDays } from '@/lib/date';
import { getMoodTokens, type Mood } from '@/lib/moods';

const LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export interface WeekMoodDotsRowProps {
  weekStartISO: string;
  todayISO: string;
  logsByDate: Record<string, Mood>;
  className?: string;
}

export function WeekMoodDotsRow({
  weekStartISO,
  todayISO,
  logsByDate,
  className,
}: WeekMoodDotsRowProps) {
  const days = weekDays(weekStartISO);
  return (
    <div className={clsx('grid grid-cols-7 gap-2 px-2', className)}>
      {days.map((iso, i) => {
        const mood = logsByDate[iso];
        const isToday = iso === todayISO;
        const dayNum = Number(iso.slice(-2));
        const bg = mood ? getMoodTokens(mood).bodyMid : 'transparent';
        return (
          <div key={iso} className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-ink-muted">{LABELS[i]}</span>
            <div
              data-testid={`day-cell-${iso}`}
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold',
                mood ? 'text-white' : 'border border-ink-soft text-ink-muted',
                isToday && 'ring-2 ring-ink ring-offset-2 ring-offset-transparent outline-none'
              )}
              style={{ backgroundColor: bg }}
            >
              {dayNum}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests + commit**

Run: `npm test -- WeekMoodDotsRow`
Expected: 3 passing.

```bash
git add components/home/WeekMoodDotsRow.tsx __tests__/components/home/WeekMoodDotsRow.test.tsx
git commit -m "feat(home): WeekMoodDotsRow with today ring and mood-filled circles

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 29: Home page shell

**Files:**
- Create: `lib/hooks/use-mood-week.ts`
- Create: `app/(app)/home/page.tsx`

- [ ] **Step 1: Implement the week hook**

Create `lib/hooks/use-mood-week.ts`:
```ts
'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { startOfWeekISO } from '@/lib/date';
import type { Mood } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

export function useMoodWeek(athlete: Athlete | null) {
  const [weekStartISO] = useState(() => startOfWeekISO(new Date()));
  const [logsByDate, setLogsByDate] = useState<Record<string, Mood>>({});

  useEffect(() => {
    if (!athlete) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabaseClient()
        .from('mood_logs')
        .select('date,mood')
        .eq('athlete', athlete)
        .gte('date', weekStartISO);
      if (cancelled || error || !data) return;
      const map: Record<string, Mood> = {};
      for (const row of data as { date: string; mood: Mood }[]) {
        map[row.date] = row.mood;
      }
      setLogsByDate(map);
    })();
    return () => { cancelled = true; };
  }, [athlete, weekStartISO]);

  return { weekStartISO, logsByDate };
}
```

- [ ] **Step 2: Implement the page**

Create `app/(app)/home/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { WeekMoodDotsRow } from '@/components/home/WeekMoodDotsRow';
import { SegmentedDayWeekMonth, type Range } from '@/components/controls/SegmentedDayWeekMonth';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodToday } from '@/lib/hooks/use-mood-today';
import { useMoodWeek } from '@/lib/hooks/use-mood-week';
import { todayISO } from '@/lib/date';

export default function HomePage() {
  const athlete = useAthlete();
  const { mood } = useMoodToday(athlete);
  const { weekStartISO, logsByDate } = useMoodWeek(athlete);
  const [range, setRange] = useState<Range>('week');

  if (!athlete || !mood) return null;

  return (
    <main className="flex flex-col gap-5 px-1 pt-2">
      <GreetingHeader athlete={athlete} todayMood={mood.mood} />
      <div className="px-5"><InlineSaveText /></div>

      <div className="px-5">
        <SegmentedDayWeekMonth value={range} onChange={setRange} />
      </div>

      <section className="px-3">
        <WeekMoodDotsRow
          weekStartISO={weekStartISO}
          todayISO={todayISO()}
          logsByDate={logsByDate}
        />
      </section>

      <section className="mx-5 mt-2 rounded-card bg-white p-5 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Próximo paso
        </p>
        <p className="mt-1 font-sans text-base font-bold text-ink">
          Las funciones de Training, Comidas y Gastos llegan en siguientes planes.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Smoke build**

Run:
```bash
npx next build
```
Expected: build succeeds.

- [ ] **Step 4: Manual smoke**

Run:
```bash
npm run dev > /tmp/mkxa-dev.log 2>&1 &
sleep 6
curl -sf http://localhost:3000 -o /dev/null -w "%{http_code}\n"
kill %1
```
Expected: `200` (the page redirects client-side, but the document responds 200).

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/use-mood-week.ts "app/(app)/home/page.tsx"
git commit -m "feat(home): home shell with greeting, segmented control, week mood dots

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 30: Vercel deploy

**Files:**
- Create: `vercel.json` (optional but explicit)

- [ ] **Step 1: Add Vercel config (optional but explicit)**

Create `vercel.json`:
```json
{
  "framework": "nextjs"
}
```

- [ ] **Step 2: Connect repo and set env vars (one-time, manual)**

In the Vercel dashboard:
- Import `mkgm2000/mkxa`.
- Confirm Next.js framework auto-detection.
- Set Environment Variables (Production + Preview + Development):
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://jxyqbtttgpdokotmbeud.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (from `legacy/index.html`)
  - `ANTHROPIC_API_KEY` = (Production + Preview only — you can leave Dev empty until needed)

- [ ] **Step 3: Push and verify deploy**

```bash
git push origin main
```

Watch the Vercel build log; expect a successful deploy. Open the preview URL in mobile view and verify:
1. `/` redirects to `/pick`.
2. Picking MK navigates to `/home` and prompts the mood check-in (since `mood_logs` is empty for today).
3. Choosing a mood and confirming dismisses the gate and reveals the home shell with the mood-tinted gradient.
4. Bottom nav is present with five icons and "Inicio" highlighted.

- [ ] **Step 4: Commit and push the vercel.json**

```bash
git add vercel.json
git commit -m "chore: vercel config

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Task 31: Final pass

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass. If anything is red, fix and re-run.

- [ ] **Step 2: Run the production build**

Run: `npx next build`
Expected: clean build.

- [ ] **Step 3: Verify there are no emojis or stray legacy patterns in the new code**

Run:
```bash
grep -RE "[\xE2-\xF4]" components app lib | grep -v "node_modules" | grep -v "\.svg" | head
```
Investigate any matches. (Most should be safe characters from CSS/SVG; flag any emoji explicitly.)

- [ ] **Step 4: Push final state**

```bash
git status
git push origin main
```
Expected: working tree clean, push succeeds.

---

## Self-review checklist (run after writing this plan, before execution)

- ✅ Spec coverage:
  - Stack scaffold → Tasks 2–4
  - Mona Sans + tokens → Tasks 5–6
  - Mood blob characters 1:1 from handoff → Tasks 7–9
  - MoodGradientBg → Task 10
  - Save feedback (`InlineSaveText` + store) → Task 11
  - Header action button → Task 12
  - Segmented control → Task 13
  - Bottom navigation (5 tabs) → Task 14
  - Supabase clients → Task 15
  - `mood_logs` migration → Task 16
  - Date helpers → Task 17
  - Athlete picker + context + persistence → Tasks 18, 24, 25
  - `useMoodToday` hook → Task 19
  - MoodTokenStrip + Wave + MoodCheckIn → Tasks 20–22
  - MoodGate → Task 23
  - `(app)` shell layout → Task 26
  - Home shell (greeting + segmented + week dots) → Tasks 27–29
  - Deploy → Task 30
  - Out of scope for Plan 1 (deferred to subsequent plans): Training port, Expenses, Receipt OCR, Meals (all sub-modules), Profile, Recharts widgets.

- ✅ No placeholders: no "TODO" / "TBD" / "implement later". Every code block is concrete.

- ✅ Type consistency: `Mood`, `Athlete`, `MoodLog`, `Range`, `SaveStatus`, `MoodTokens` all defined where first used; later tasks import them. `saveState` is named the same across the store, component and hook. `useMoodToday` signature `(athlete) -> { mood, loading, save }` is consistent across the hook, its test, and `MoodGate`.

- ✅ Frequent commits: each task ends with a commit; deps and tokens are isolated.

- ✅ TDD: every behavioural unit (`moods`, `MoodBlob`, `MoodGradientBg`, `InlineSaveText`, `HeaderActionButton`, `SegmentedDayWeekMonth`, `BottomNav`, `MoodTokenStrip`, `MoodCheckIn`, `MoodGate`, `athlete-context`, `useMoodToday`, `date`, `GreetingHeader`, `WeekMoodDotsRow`) has tests written before implementation.

- ✅ YAGNI: no widgets for expenses/training that don't exist yet; the home shell shows a placeholder card making this explicit.

- ✅ DRY: a single `<MoodBlob>` covers all 10 variants; `getMoodTokens(m)` is the single source of mood colors; no duplicated SVG path.
