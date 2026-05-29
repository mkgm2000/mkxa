# Pick Avatars + Mood Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pick screen with a richer layout (MKXA wordmark + uploadable photo avatars + per-athlete training streak) and replace the `MoodTokenStrip` in `MoodCheckIn` with a continuous horizontal slider whose background interpolates smoothly between adjacent mood gradients.

**Architecture:** New `athlete_profiles` table + public `avatars` Storage bucket back the photos. Three new visual primitives (`MKXALogo`, `AvatarCircle`, `AvatarUploadButton`) compose into `AvatarTile`, the building block for the pick screen and the profile page. The mood slider is a single self-contained client component that owns its drag state, renders a memoised `MoodBlob` thumb, and drives the page background through a CSS custom property computed by a small `lerpHex` helper. Streak is a pure function over existing `registros` rows.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind v3.4 · Supabase JS (browser anon client + Storage) · lucide-react (stroke 1.5) · Vitest + React Testing Library + jsdom · Supabase CLI for the migration.

**Reference docs:**
- `docs/superpowers/specs/2026-05-29-pick-avatars-mood-slider-design.md` — spec (source of truth).
- `docs/superpowers/specs/2026-05-28-mkxa-life-app-design.md` — original system spec.

---

## File Structure

| File | Purpose |
|---|---|
| `supabase/migrations/20260529120000_athlete_profiles.sql` | New table + storage bucket + open policies. |
| `lib/moods.ts` (modify) | Add `MOOD_ORDER` constant. |
| `lib/color.ts` (create) | `lerpHex(a, b, t)` pure helper. |
| `lib/streak.ts` (create) | `computeWeekStreak(rows, currentWeek)` pure helper. |
| `lib/hooks/use-athlete-profile.ts` (create) | `useAthleteProfile(athlete)`, `useAvatarUpload(athlete)`. |
| `lib/hooks/use-week-streak.ts` (create) | `useWeekStreak(athlete)`. |
| `components/branding/MKXALogo.tsx` (create) | SVG wordmark with legacy teal/lime fills. |
| `components/profile/AvatarCircle.tsx` (create) | Image-or-initials avatar primitive. |
| `components/profile/AvatarUploadButton.tsx` (create) | Camera/Pencil button + crop+upload pipeline. |
| `components/profile/AvatarTile.tsx` (create) | Pick-screen athlete card. |
| `components/mood/MoodSlider.tsx` (create) | Continuous slider with interpolated background. |
| `components/mood/MoodCheckIn.tsx` (modify) | Swap `MoodTokenStrip` for `MoodSlider`. |
| `components/profile/AthleteCard.tsx` (modify) | Use `AvatarCircle` + inline `AvatarUploadButton`. |
| `components/home/GreetingHeader.tsx` (modify) | Optional small avatar circle on the right, link to `/profile`. |
| `app/pick/page.tsx` (rewrite) | Compose logo + two `AvatarTile`s. |
| `supabase/README.md` (modify) | Add migration entry. |
| `__tests__/lib/color.test.ts` (create) | Test `lerpHex`. |
| `__tests__/lib/streak.test.ts` (create) | Test `computeWeekStreak`. |
| `__tests__/lib/moods.test.ts` (modify) | Add assertion for `MOOD_ORDER`. |
| `__tests__/components/branding/MKXALogo.test.tsx` (create) | Accessibility name. |
| `__tests__/components/profile/AvatarCircle.test.tsx` (create) | Img + fallback. |
| `__tests__/components/profile/AvatarUploadButton.test.tsx` (create) | Validation guards (size, MIME). |
| `__tests__/components/mood/MoodSlider.test.tsx` (create) | Keyboard interactions + onChange semantics. |
| `__tests__/lib/hooks/use-week-streak.test.tsx` (create) | Mocked supabase. |

---

## Pre-flight

- [ ] **Pre-flight: confirm clean tree on main**

Run:
```bash
cd ~/IdeaProjects/mkxa
pwd
git status
git log --oneline -3
```
Expected: pwd `~/IdeaProjects/mkxa`, working tree clean, head is the spec commit `2c0c9fb docs: pick screen avatars + mood slider design spec`.

- [ ] **Pre-flight: confirm tests + build green on the starting point**

Run: `npm test -- --run` (expect 148 passing) and `npx next build` (expect successful build with all current routes). If anything is red, stop and fix the broken baseline before continuing.

---

## Task 1: Add `MOOD_ORDER` to `lib/moods.ts`

**Files:**
- Modify: `lib/moods.ts`
- Modify: `__tests__/lib/moods.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `__tests__/lib/moods.test.ts`:
```ts
import { MOOD_ORDER } from '@/lib/moods';

describe('MOOD_ORDER', () => {
  it('has the 10 moods in the best→worst order picked by the user', () => {
    expect(MOOD_ORDER).toEqual([
      'joyful', 'happy', 'love', 'sleepy', 'neutral',
      'annoyed', 'worried', 'sad', 'angry', 'dizzy',
    ]);
  });

  it('contains every mood exactly once', () => {
    expect(new Set(MOOD_ORDER).size).toBe(10);
    for (const m of MOODS) expect(MOOD_ORDER).toContain(m);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- moods`
Expected: FAIL — `MOOD_ORDER is not exported`.

- [ ] **Step 3: Implement**

Add to `lib/moods.ts` just after the existing `MOODS` declaration:
```ts
export const MOOD_ORDER: readonly Mood[] = [
  'joyful', 'happy', 'love', 'sleepy', 'neutral',
  'annoyed', 'worried', 'sad', 'angry', 'dizzy',
] as const;
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- moods` → PASS (5 tests now).
Commit:
```bash
git add lib/moods.ts __tests__/lib/moods.test.ts
git commit -m "feat(moods): MOOD_ORDER constant (best→worst)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `lib/color.ts` — `lerpHex` helper

**Files:**
- Create: `lib/color.ts`
- Create: `__tests__/lib/color.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/color.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { lerpHex } from '@/lib/color';

describe('lerpHex', () => {
  it('returns a at t=0', () => {
    expect(lerpHex('#000000', '#ffffff', 0)).toBe('#000000');
  });
  it('returns b at t=1', () => {
    expect(lerpHex('#000000', '#ffffff', 1)).toBe('#ffffff');
  });
  it('returns the midpoint at t=0.5', () => {
    expect(lerpHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
  it('interpolates each channel independently', () => {
    expect(lerpHex('#ff0000', '#00ff00', 0.5)).toBe('#808000');
  });
  it('clamps t below 0', () => {
    expect(lerpHex('#102030', '#a0b0c0', -0.5)).toBe('#102030');
  });
  it('clamps t above 1', () => {
    expect(lerpHex('#102030', '#a0b0c0', 2)).toBe('#a0b0c0');
  });
  it('handles mixed case input case-insensitively and returns lowercase', () => {
    expect(lerpHex('#FF8800', '#00ff00', 0)).toBe('#ff8800');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- color`
Expected: FAIL — `Cannot find module '@/lib/color'`.

- [ ] **Step 3: Implement**

Create `lib/color.ts`:
```ts
/**
 * Linear interpolation between two #rrggbb hex strings.
 * t is clamped to [0,1]. Output is lowercase #rrggbb.
 */
export function lerpHex(a: string, b: string, t: number): string {
  const ct = Math.min(1, Math.max(0, t));
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const lerpChan = (shift: number) => {
    const av = (pa >> shift) & 0xff;
    const bv = (pb >> shift) & 0xff;
    return Math.round(av + (bv - av) * ct);
  };
  const r = lerpChan(16);
  const g = lerpChan(8);
  const bl = lerpChan(0);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- color` → 7 PASS.
Commit:
```bash
git add lib/color.ts __tests__/lib/color.test.ts
git commit -m "feat(lib): lerpHex color interpolation helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `lib/streak.ts` — `computeWeekStreak`

**Files:**
- Create: `lib/streak.ts`
- Create: `__tests__/lib/streak.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/streak.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeWeekStreak } from '@/lib/streak';

describe('computeWeekStreak', () => {
  it('returns 0 when there are no rows', () => {
    expect(computeWeekStreak([], 5)).toBe(0);
  });

  it('counts the current week alone', () => {
    expect(computeWeekStreak(
      [{ week: 5, day_key: 'D1', completed: true }],
      5,
    )).toBe(1);
  });

  it('does not count an uncompleted row', () => {
    expect(computeWeekStreak(
      [{ week: 5, day_key: 'D1', completed: false }],
      5,
    )).toBe(0);
  });

  it('returns 0 when the current week has nothing even if past weeks do', () => {
    expect(computeWeekStreak(
      [{ week: 3, day_key: 'D1', completed: true }],
      5,
    )).toBe(0);
  });

  it('counts consecutive weeks back from current', () => {
    expect(computeWeekStreak(
      [
        { week: 5, day_key: 'D1', completed: true },
        { week: 4, day_key: 'D2', completed: true },
        { week: 3, day_key: 'D1', completed: true },
      ],
      5,
    )).toBe(3);
  });

  it('breaks at a missing week in the middle', () => {
    expect(computeWeekStreak(
      [
        { week: 5, day_key: 'D1', completed: true },
        { week: 3, day_key: 'D1', completed: true },
      ],
      5,
    )).toBe(1);
  });

  it('treats a week with at least one completed row as a hit', () => {
    expect(computeWeekStreak(
      [
        { week: 5, day_key: 'D1', completed: false },
        { week: 5, day_key: 'D2', completed: true },
      ],
      5,
    )).toBe(1);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- streak`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/streak.ts`:
```ts
export interface CompletedRow {
  week: number;
  day_key: string;
  completed: boolean | null;
}

/**
 * Consecutive ISO-plan weeks (counting backwards from `currentWeek`) with
 * at least one `completed = true` row. A missing/uncompleted week breaks
 * the streak.
 */
export function computeWeekStreak(rows: CompletedRow[], currentWeek: number): number {
  const weeks = new Set<number>();
  for (const r of rows) if (r.completed === true) weeks.add(r.week);
  let streak = 0;
  for (let w = currentWeek; w >= 1; w--) {
    if (weeks.has(w)) streak++;
    else break;
  }
  return streak;
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- streak` → 7 PASS.
Commit:
```bash
git add lib/streak.ts __tests__/lib/streak.test.ts
git commit -m "feat(lib): computeWeekStreak consecutive-weeks helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Migration — `athlete_profiles` + `avatars` bucket

**Files:**
- Create: `supabase/migrations/20260529120000_athlete_profiles.sql`
- Modify: `supabase/README.md`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260529120000_athlete_profiles.sql`:
```sql
create table if not exists athlete_profiles (
  athlete    text primary key check (athlete in ('MK','Xabi')),
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table athlete_profiles enable row level security;

drop policy if exists "athlete_profiles_all" on athlete_profiles;
create policy "athlete_profiles_all" on athlete_profiles for all using (true) with check (true);

create or replace function set_athlete_profiles_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists athlete_profiles_updated_at on athlete_profiles;
create trigger athlete_profiles_updated_at
  before update on athlete_profiles
  for each row execute function set_athlete_profiles_updated_at();

insert into athlete_profiles (athlete) values ('MK'), ('Xabi')
  on conflict (athlete) do nothing;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatars_select" on storage.objects;
create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_write" on storage.objects;
create policy "avatars_write" on storage.objects
  for all using (bucket_id = 'avatars') with check (bucket_id = 'avatars');
```

- [ ] **Step 2: Append to the migrations log**

Edit `supabase/README.md` and add at the bottom of the "Applied log" list:
```markdown
- `20260529120000_athlete_profiles.sql` — pending (athlete_profiles table + avatars bucket)
```

- [ ] **Step 3: Apply via Supabase CLI with the owner PAT**

Run (replace `<PAT>` with the owner token shared earlier):
```bash
cd ~/IdeaProjects/mkxa
SUPABASE_ACCESS_TOKEN=<PAT> supabase db push --include-all
```
Expected: "Applying migration 20260529120000_athlete_profiles.sql..." then "Finished supabase db push." If the user does not provide the PAT at execution time, stop and ask — the migration must run before subsequent tasks because the avatar pipeline will fail otherwise.

- [ ] **Step 4: Verify with a curl probe**

Run:
```bash
curl -s "https://jxyqbtttgpdokotmbeud.supabase.co/rest/v1/athlete_profiles?select=athlete,avatar_url&order=athlete" \
  -H "apikey: $(grep -oE 'eyJ[A-Za-z0-9_.-]+' .env.local | head -1)"
```
Expected: JSON `[{"athlete":"MK","avatar_url":null},{"athlete":"Xabi","avatar_url":null}]`.

- [ ] **Step 5: Update the log to "applied"**

Edit `supabase/README.md` and change the line you just added to:
```markdown
- `20260529120000_athlete_profiles.sql` — applied 2026-05-29 (athlete_profiles table + avatars bucket)
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260529120000_athlete_profiles.sql supabase/README.md
git commit -m "feat(db): athlete_profiles + avatars bucket

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Hook — `useAthleteProfile`

**Files:**
- Create: `lib/hooks/use-athlete-profile.ts`
- Create: `__tests__/lib/hooks/use-athlete-profile.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/hooks/use-athlete-profile.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';

const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({ from: () => ({ select }) }),
}));

function Probe() {
  const { profile, loading } = useAthleteProfile('MK');
  return (
    <>
      <p>loading:{String(loading)}</p>
      <p>url:{profile?.avatar_url ?? 'none'}</p>
    </>
  );
}

describe('useAthleteProfile', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns the row when present', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { athlete: 'MK', avatar_url: 'https://x/y.jpg' }, error: null });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('url:https://x/y.jpg')).toBeInTheDocument();
  });

  it('returns null avatar when row missing', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('url:none')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- use-athlete-profile`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/hooks/use-athlete-profile.ts`:
```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Athlete } from '@/lib/athlete-context';

export interface AthleteProfile {
  athlete: Athlete;
  avatar_url: string | null;
}

export function useAthleteProfile(athlete: Athlete | null) {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(athlete !== null);

  const refresh = useCallback(async () => {
    if (!athlete) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabaseClient()
      .from('athlete_profiles')
      .select('athlete,avatar_url')
      .eq('athlete', athlete)
      .maybeSingle();
    if (error) { setLoading(false); return; }
    setProfile(data as AthleteProfile | null);
    setLoading(false);
  }, [athlete]);

  useEffect(() => { refresh(); }, [refresh]);

  return { profile, loading, refresh };
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- use-athlete-profile` → 2 PASS.
Commit:
```bash
git add lib/hooks/use-athlete-profile.ts __tests__/lib/hooks/use-athlete-profile.test.tsx
git commit -m "feat(hooks): useAthleteProfile reads athlete_profiles row

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Hook — `useWeekStreak`

**Files:**
- Create: `lib/hooks/use-week-streak.ts`
- Create: `__tests__/lib/hooks/use-week-streak.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/hooks/use-week-streak.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWeekStreak } from '@/lib/hooks/use-week-streak';

const eq = vi.fn();
const select = vi.fn(() => ({ eq }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({ from: () => ({ select }) }),
}));
vi.mock('@/lib/plan-hyrox', () => ({
  getCurrentWeek: () => 3,
}));

function Probe() {
  const { streak, loading } = useWeekStreak('MK');
  return (
    <>
      <p>loading:{String(loading)}</p>
      <p>streak:{streak}</p>
    </>
  );
}

describe('useWeekStreak', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns the consecutive-weeks count', async () => {
    eq.mockResolvedValueOnce({
      data: [
        { week: 3, day_key: 'D1', completed: true },
        { week: 2, day_key: 'D2', completed: true },
      ],
      error: null,
    });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('streak:2')).toBeInTheDocument();
  });

  it('returns 0 on error', async () => {
    eq.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('streak:0')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- use-week-streak`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/hooks/use-week-streak.ts`:
```ts
'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { getCurrentWeek } from '@/lib/plan-hyrox';
import { computeWeekStreak, type CompletedRow } from '@/lib/streak';
import type { Athlete } from '@/lib/athlete-context';

export function useWeekStreak(athlete: Athlete | null) {
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(athlete !== null);

  useEffect(() => {
    if (!athlete) { setStreak(0); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient()
        .from('registros')
        .select('week,day_key,completed')
        .eq('athlete', athlete);
      if (cancelled) return;
      if (error || !data) { setStreak(0); setLoading(false); return; }
      setStreak(computeWeekStreak(data as CompletedRow[], getCurrentWeek()));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete]);

  return { streak, loading };
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- use-week-streak` → 2 PASS.
Commit:
```bash
git add lib/hooks/use-week-streak.ts __tests__/lib/hooks/use-week-streak.test.tsx
git commit -m "feat(hooks): useWeekStreak per-athlete consecutive-week count

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `<MKXALogo>` — SVG wordmark

**Files:**
- Create: `components/branding/MKXALogo.tsx`
- Create: `__tests__/components/branding/MKXALogo.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/branding/MKXALogo.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MKXALogo } from '@/components/branding/MKXALogo';

describe('MKXALogo', () => {
  it('renders an accessible MKXA wordmark', () => {
    render(<MKXALogo />);
    const svg = screen.getByRole('img', { name: 'MKXA' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  it('uses the legacy teal for M/K and lime for X/A fills', () => {
    const { container } = render(<MKXALogo />);
    const texts = container.querySelectorAll('text');
    const fills = Array.from(texts).map((t) => t.getAttribute('fill'));
    expect(fills).toEqual(['#00C49A', '#00C49A', '#7CB518', '#7CB518']);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- MKXALogo`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `components/branding/MKXALogo.tsx`:
```tsx
interface MKXALogoProps { size?: number; className?: string }

export function MKXALogo({ size = 80, className }: MKXALogoProps) {
  // Width is roughly 4× height; tweak per glyph if Mona Sans renders narrower
  // than expected. Each <text> sits side by side with a small letter-space.
  const h = size;
  const w = Math.round(size * 3.2);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label="MKXA"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x={w * 0.04}
        y={h * 0.82}
        fontFamily="var(--font-mona), system-ui, sans-serif"
        fontWeight={800}
        fontSize={h * 0.95}
        letterSpacing={-h * 0.02}
        fill="#00C49A"
      >M</text>
      <text
        x={w * 0.30}
        y={h * 0.82}
        fontFamily="var(--font-mona), system-ui, sans-serif"
        fontWeight={800}
        fontSize={h * 0.95}
        letterSpacing={-h * 0.02}
        fill="#00C49A"
      >K</text>
      <text
        x={w * 0.54}
        y={h * 0.82}
        fontFamily="var(--font-mona), system-ui, sans-serif"
        fontWeight={800}
        fontSize={h * 0.95}
        letterSpacing={-h * 0.02}
        fill="#7CB518"
      >X</text>
      <text
        x={w * 0.78}
        y={h * 0.82}
        fontFamily="var(--font-mona), system-ui, sans-serif"
        fontWeight={800}
        fontSize={h * 0.95}
        letterSpacing={-h * 0.02}
        fill="#7CB518"
      >A</text>
    </svg>
  );
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- MKXALogo` → 2 PASS.
Commit:
```bash
git add components/branding/MKXALogo.tsx __tests__/components/branding/MKXALogo.test.tsx
git commit -m "feat(branding): MKXALogo wordmark in legacy teal/lime

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `<AvatarCircle>` — photo-or-initials primitive

**Files:**
- Create: `components/profile/AvatarCircle.tsx`
- Create: `__tests__/components/profile/AvatarCircle.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/profile/AvatarCircle.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AvatarCircle } from '@/components/profile/AvatarCircle';

describe('AvatarCircle', () => {
  it('renders the image when src is provided', () => {
    render(<AvatarCircle athlete="MK" src="https://example.com/x.jpg" />);
    const img = screen.getByRole('img', { name: /MK/i });
    expect(img).toHaveAttribute('src', 'https://example.com/x.jpg');
  });

  it('falls back to initials when src is null', () => {
    render(<AvatarCircle athlete="Xabi" src={null} />);
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('uses MK initials with the love mood color, Xabi with joyful', () => {
    const { container, rerender } = render(<AvatarCircle athlete="MK" src={null} />);
    const mkBg = (container.firstChild as HTMLElement).style.backgroundColor;
    expect(mkBg).not.toBe('');
    rerender(<AvatarCircle athlete="Xabi" src={null} />);
    const xaBg = (container.firstChild as HTMLElement).style.backgroundColor;
    expect(xaBg).not.toBe(mkBg);
  });

  it('falls back to initials when the image fails to load', () => {
    render(<AvatarCircle athlete="MK" src="https://bad/x.jpg" />);
    const img = screen.getByRole('img', { name: /MK/i });
    fireEvent.error(img);
    expect(screen.getByText('M')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- AvatarCircle`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `components/profile/AvatarCircle.tsx`:
```tsx
'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { getMoodTokens } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

interface AvatarCircleProps {
  athlete: Athlete;
  src: string | null;
  size?: number;
  className?: string;
}

export function AvatarCircle({ athlete, src, size = 72, className }: AvatarCircleProps) {
  const [broken, setBroken] = useState(false);
  const fallbackMood = athlete === 'MK' ? 'love' : 'joyful';
  const bg = getMoodTokens(fallbackMood).bodyMid;
  const initials = athlete === 'MK' ? 'M' : 'X';
  const fontSize = Math.round(size * 0.45);

  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Avatar ${athlete}`}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className={clsx('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Avatar ${athlete}`}
      className={clsx(
        'flex items-center justify-center rounded-full font-sans font-extrabold text-white',
        className,
      )}
      style={{ width: size, height: size, backgroundColor: bg, fontSize }}
    >
      {initials}
    </div>
  );
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- AvatarCircle` → 4 PASS.
Commit:
```bash
git add components/profile/AvatarCircle.tsx __tests__/components/profile/AvatarCircle.test.tsx
git commit -m "feat(profile): AvatarCircle photo-or-initials primitive

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `<AvatarUploadButton>` — file pick + crop + upload

**Files:**
- Create: `components/profile/AvatarUploadButton.tsx`
- Create: `__tests__/components/profile/AvatarUploadButton.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/profile/AvatarUploadButton.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvatarUploadButton } from '@/components/profile/AvatarUploadButton';

const upload = vi.fn();
const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://x/avatars/MK.jpg' } }));
const upsert = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({
    from: () => ({ upsert }),
    storage: { from: () => ({ upload, getPublicUrl }) },
  }),
}));

describe('AvatarUploadButton', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('overlay variant renders an aria-labeled camera button', () => {
    render(<AvatarUploadButton athlete="MK" currentUrl={null} variant="overlay" onUploaded={() => {}} />);
    expect(screen.getByRole('button', { name: /cambiar foto/i })).toBeInTheDocument();
  });

  it('rejects files larger than 2MB', async () => {
    const onUploaded = vi.fn();
    render(<AvatarUploadButton athlete="MK" currentUrl={null} variant="overlay" onUploaded={onUploaded} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const huge = new File([new Uint8Array(3 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [huge] });
    fireEvent.change(input);
    await waitFor(() => expect(screen.getByText(/supera/i)).toBeInTheDocument());
    expect(upload).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('rejects non-image files', async () => {
    render(<AvatarUploadButton athlete="MK" currentUrl={null} variant="overlay" onUploaded={() => {}} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const txt = new File(['hello'], 'a.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [txt] });
    fireEvent.change(input);
    await waitFor(() => expect(screen.getByText(/imagen/i)).toBeInTheDocument());
    expect(upload).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- AvatarUploadButton`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `components/profile/AvatarUploadButton.tsx`:
```tsx
'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Camera, Pencil } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { Athlete } from '@/lib/athlete-context';

interface AvatarUploadButtonProps {
  athlete: Athlete;
  currentUrl: string | null;
  variant: 'overlay' | 'inline';
  onUploaded: (newUrl: string) => void;
  className?: string;
}

const MAX_BYTES = 2 * 1024 * 1024;

async function cropToJpegBlob(file: File, size = 256, quality = 0.85): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read error'));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('image load error'));
    i.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas ctx');
  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = Math.max(0, Math.round((img.naturalWidth - minSide) / 2));
  const sy = Math.max(0, Math.round((img.naturalHeight - minSide) / 2));
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob null'))),
      'image/jpeg',
      quality,
    ),
  );
}

export function AvatarUploadButton({
  athlete, currentUrl, variant, onUploaded, className,
}: AvatarUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handle(file: File | null) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('La imagen supera los 2 MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes.');
      return;
    }
    setUploading(true);
    saveState.getState().set('saving');
    try {
      const blob = await cropToJpegBlob(file);
      const supa = supabaseClient();
      const path = `${athlete}.jpg`;
      const { error: upErr } = await supa.storage.from('avatars').upload(path, blob, {
        upsert: true,
        cacheControl: '0',
        contentType: 'image/jpeg',
      });
      if (upErr) throw upErr;
      const { data: pub } = supa.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supa.from('athlete_profiles').upsert({
        athlete, avatar_url: url,
      }, { onConflict: 'athlete' });
      if (dbErr) throw dbErr;
      saveState.getState().set('saved');
      onUploaded(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo subir';
      setError(msg);
      saveState.getState().set('error', msg);
    } finally {
      setUploading(false);
    }
  }

  const ButtonInner = variant === 'overlay' ? (
    <Camera size={14} strokeWidth={1.5} className="text-white" aria-hidden />
  ) : (
    <span className="flex items-center gap-2">
      <Pencil size={14} strokeWidth={1.5} aria-hidden /> Cambiar foto
    </span>
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        aria-label="Cambiar foto de perfil"
        disabled={uploading}
        className={clsx(
          variant === 'overlay'
            ? 'absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-ink shadow-action'
            : 'flex w-full items-center justify-center gap-2 rounded-action border border-ink-soft py-2 text-[13px] font-medium text-ink',
          className,
        )}
      >
        {ButtonInner}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
      {error && (
        <p className="mt-1 text-[11px] text-danger" role="alert">{error}</p>
      )}
      {/* currentUrl is read-only context for the button; not yet used visually but kept for future revert UI */}
      <span className="hidden" aria-hidden>{currentUrl ?? ''}</span>
    </>
  );
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- AvatarUploadButton` → 3 PASS.
Commit:
```bash
git add components/profile/AvatarUploadButton.tsx __tests__/components/profile/AvatarUploadButton.test.tsx
git commit -m "feat(profile): AvatarUploadButton with 2MB guard + canvas crop

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `<AvatarTile>` — pick-screen card

**Files:**
- Create: `components/profile/AvatarTile.tsx`

- [ ] **Step 1: Implement (no unit test — composition only; tested through pick page tests)**

Create `components/profile/AvatarTile.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { AvatarCircle } from './AvatarCircle';
import { AvatarUploadButton } from './AvatarUploadButton';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';
import { useWeekStreak } from '@/lib/hooks/use-week-streak';
import { setAthlete, type Athlete } from '@/lib/athlete-context';

export function AvatarTile({ athlete }: { athlete: Athlete }) {
  const router = useRouter();
  const { profile, refresh } = useAthleteProfile(athlete);
  const { streak } = useWeekStreak(athlete);

  function pickAndGo() {
    setAthlete(athlete);
    router.push('/home');
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={pickAndGo}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pickAndGo(); }}
      aria-label={`Entrar como ${athlete}`}
      className="flex w-full max-w-md cursor-pointer items-center gap-4 rounded-card bg-white p-4 shadow-card transition-transform duration-150 active:scale-[0.98]"
    >
      <div className="relative">
        <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={72} />
        <AvatarUploadButton
          athlete={athlete}
          currentUrl={profile?.avatar_url ?? null}
          variant="overlay"
          onUploaded={() => refresh()}
        />
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Atleta
        </p>
        <p className="font-sans text-[28px] font-extrabold leading-none tracking-tightest text-ink">
          {athlete}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[13px] font-medium text-ink-muted">
          <Flame size={14} strokeWidth={1.5} aria-hidden />
          {streak} sem.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit (smoke compile checked by the build at the end of Task 12)**

```bash
git add components/profile/AvatarTile.tsx
git commit -m "feat(profile): AvatarTile pick-screen athlete card

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Rewrite `app/pick/page.tsx`

**Files:**
- Modify: `app/pick/page.tsx`

- [ ] **Step 1: Replace contents**

Replace `app/pick/page.tsx` with:
```tsx
'use client';

import { MoodGradientBg } from '@/components/mood/MoodGradientBg';
import { MKXALogo } from '@/components/branding/MKXALogo';
import { AvatarTile } from '@/components/profile/AvatarTile';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';

export default function PickPage() {
  return (
    <MoodGradientBg mood="neutral">
      <main
        className="flex min-h-dvh w-full flex-col items-center justify-center gap-8 px-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}
      >
        <MKXALogo size={80} />

        <h1 className="text-center font-sans text-[28px] font-extrabold tracking-tightest text-ink">
          ¿Quién entra?
        </h1>

        <div className="flex w-full flex-col items-center gap-3">
          <AvatarTile athlete="MK" />
          <AvatarTile athlete="Xabi" />
        </div>

        <InlineSaveText />
      </main>
    </MoodGradientBg>
  );
}
```

- [ ] **Step 2: Smoke-run dev server, verify route renders**

Run:
```bash
cd ~/IdeaProjects/mkxa
npm run dev > /tmp/mkxa-dev.log 2>&1 &
sleep 8
curl -sf http://localhost:3000/pick -o /dev/null -w "%{http_code}\n"
kill %1
```
Expected: `200`.

- [ ] **Step 3: Commit**

```bash
git add app/pick/page.tsx
git commit -m "feat(pick): logo + uploadable avatars + per-athlete streak

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: `<MoodSlider>` — continuous mood slider

**Files:**
- Create: `components/mood/MoodSlider.tsx`
- Create: `__tests__/components/mood/MoodSlider.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/mood/MoodSlider.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MoodSlider } from '@/components/mood/MoodSlider';
import { MOOD_ORDER } from '@/lib/moods';

describe('MoodSlider', () => {
  it('exposes a slider role with the current valuenow', () => {
    render(<MoodSlider value="joyful" onChange={() => {}} />);
    const s = screen.getByRole('slider');
    expect(s).toHaveAttribute('aria-valuemin', '0');
    expect(s).toHaveAttribute('aria-valuemax', '9');
    expect(s).toHaveAttribute('aria-valuenow', String(MOOD_ORDER.indexOf('joyful')));
  });

  it('arrow-right moves to the next mood', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MoodSlider value="joyful" onChange={onChange} />);
    const s = screen.getByRole('slider');
    s.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('happy');
  });

  it('arrow-left at index 0 stays on joyful and does not fire onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MoodSlider value="joyful" onChange={onChange} />);
    const s = screen.getByRole('slider');
    s.focus();
    await user.keyboard('{ArrowLeft}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Home jumps to first mood, End jumps to last', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MoodSlider value="neutral" onChange={onChange} />);
    const s = screen.getByRole('slider');
    s.focus();
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('dizzy');
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('joyful');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- MoodSlider`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `components/mood/MoodSlider.tsx`:
```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { MoodBlob } from './MoodBlob';
import { MOOD_ORDER, getMoodTokens, type Mood } from '@/lib/moods';
import { lerpHex } from '@/lib/color';

interface MoodSliderProps {
  value: Mood;
  onChange: (m: Mood) => void;
  className?: string;
}

const N = MOOD_ORDER.length; // 10

function indexOf(mood: Mood): number {
  const i = MOOD_ORDER.indexOf(mood);
  return i < 0 ? 0 : i;
}

function trackGradient(): string {
  const stops = MOOD_ORDER.map((m, i) => {
    const pct = (i / (N - 1)) * 100;
    return `${getMoodTokens(m).bodyMid} ${pct.toFixed(1)}%`;
  }).join(', ');
  return `linear-gradient(to right, ${stops})`;
}

function interpolatedBg(pos: number): string {
  const exact = pos * (N - 1);
  const idx = Math.min(N - 2, Math.floor(exact));
  const t = exact - idx;
  const a = MOOD_ORDER[idx];
  const b = MOOD_ORDER[idx + 1];
  const ta = getMoodTokens(a);
  const tb = getMoodTokens(b);
  const from = lerpHex(ta.cardFrom, tb.cardFrom, t);
  const to = lerpHex(ta.cardTo, tb.cardTo, t);
  return `linear-gradient(170deg, ${from} 0%, ${to} 100%)`;
}

export function MoodSlider({ value, onChange, className }: MoodSliderProps) {
  const initialIdx = indexOf(value);
  const [pos, setPos] = useState<number>(initialIdx / (N - 1));
  const trackRef = useRef<HTMLDivElement | null>(null);
  const idx = Math.min(N - 1, Math.max(0, Math.round(pos * (N - 1))));
  const mood = MOOD_ORDER[idx];
  const label = getMoodTokens(mood).label;

  // Notify the parent only when the discrete idx changes.
  const lastIdxRef = useRef<number>(initialIdx);
  useEffect(() => {
    if (idx !== lastIdxRef.current) {
      lastIdxRef.current = idx;
      onChange(mood);
    }
  }, [idx, mood, onChange]);

  const setFromClientX = useCallback((x: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (x - r.left) / r.width));
    setPos(p);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.buttons & 1) === 0) return;
    setFromClientX(e.clientX);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = 1 / (N - 1);
    const big = e.shiftKey ? step * 2 : step;
    let next = pos;
    if (e.key === 'ArrowRight') next = Math.min(1, pos + big);
    else if (e.key === 'ArrowLeft') next = Math.max(0, pos - big);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 1;
    else return;
    e.preventDefault();
    setPos(next);
  }

  return (
    <section
      className={clsx('flex flex-col items-center gap-4', className)}
      style={{ backgroundImage: interpolatedBg(pos) }}
    >
      <MoodBlob mood={mood} size={280} animate withFloor withParticles />

      <p className="font-sans text-[24px] font-extrabold tracking-tightest text-ink">
        {label}
      </p>

      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={N - 1}
        aria-valuenow={idx}
        aria-valuetext={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="relative h-12 w-full max-w-md cursor-pointer touch-none select-none"
      >
        <div
          aria-hidden
          className="absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 rounded-full"
          style={{ backgroundImage: trackGradient() }}
        />
        <div
          aria-hidden
          className="absolute top-1/2"
          style={{ left: `${pos * 100}%`, transform: 'translate(-50%, -50%)' }}
        >
          <MoodBlob mood={mood} size={56} animate={false} withFloor={false} withParticles={false} />
        </div>
      </div>

      <div className="flex w-full max-w-md justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        <span>Mejor</span>
        <span>Peor</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- MoodSlider` → 4 PASS.
Commit:
```bash
git add components/mood/MoodSlider.tsx __tests__/components/mood/MoodSlider.test.tsx
git commit -m "feat(mood): MoodSlider continuous slider with interpolated background

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Swap `MoodTokenStrip` for `MoodSlider` in `MoodCheckIn`

**Files:**
- Modify: `components/mood/MoodCheckIn.tsx`

- [ ] **Step 1: Update the component**

Replace `components/mood/MoodCheckIn.tsx` with:
```tsx
'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { MoodSlider } from './MoodSlider';
import { MoodGradientBg } from './MoodGradientBg';
import { WaveDecoration } from './WaveDecoration';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';
import { type Mood } from '@/lib/moods';

export interface MoodCheckInProps {
  initial?: Mood;
  onConfirm: (m: Mood) => void;
}

export function MoodCheckIn({ initial = 'happy', onConfirm }: MoodCheckInProps) {
  const [mood, setMood] = useState<Mood>(initial);

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

        <WaveDecoration className="h-12 w-full max-w-[360px]" />

        <MoodSlider value={mood} onChange={setMood} />
      </section>

      <div className="h-8" />
    </MoodGradientBg>
  );
}
```

Note: the existing `MoodCheckIn.test.tsx` queries by `radio` role and `MoodTokenStrip` semantics. Update it in this task.

- [ ] **Step 2: Update the existing test**

Replace `__tests__/components/mood/MoodCheckIn.test.tsx` with:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MoodCheckIn } from '@/components/mood/MoodCheckIn';

describe('MoodCheckIn', () => {
  it('renders the question, a slider and the confirm button', () => {
    render(<MoodCheckIn onConfirm={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Cómo estás/i);
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
  });

  it('confirms with the keyboard-selected mood', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<MoodCheckIn onConfirm={onConfirm} />);
    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}'); // happy → love? No — initial happy, next is love
    await user.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalled();
    const called = onConfirm.mock.calls[0]?.[0];
    expect(['happy', 'love']).toContain(called);
  });
});
```

- [ ] **Step 3: Run tests, then commit**

Run: `npm test -- MoodCheckIn` → 2 PASS.
Commit:
```bash
git add components/mood/MoodCheckIn.tsx __tests__/components/mood/MoodCheckIn.test.tsx
git commit -m "feat(mood): MoodCheckIn uses MoodSlider instead of token strip

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Wire avatar into `<AthleteCard>` (Profile)

**Files:**
- Modify: `components/profile/AthleteCard.tsx`

- [ ] **Step 1: Update the component**

Replace `components/profile/AthleteCard.tsx` with:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { AvatarCircle } from './AvatarCircle';
import { AvatarUploadButton } from './AvatarUploadButton';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';
import { setAthlete, type Athlete } from '@/lib/athlete-context';

export function AthleteCard({ athlete }: { athlete: Athlete }) {
  const router = useRouter();
  const { profile, refresh } = useAthleteProfile(athlete);

  function change() {
    setAthlete(null);
    router.push('/pick');
  }

  return (
    <section className="mx-5 flex flex-col items-center gap-4 rounded-card bg-white p-5 shadow-card">
      <div className="relative">
        <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={96} />
      </div>
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Atleta</p>
        <p className="font-sans text-[28px] font-extrabold leading-none tracking-tightest text-ink">{athlete}</p>
      </div>
      <AvatarUploadButton
        athlete={athlete}
        currentUrl={profile?.avatar_url ?? null}
        variant="inline"
        onUploaded={() => refresh()}
      />
      <button
        type="button"
        onClick={change}
        className="w-full rounded-action border border-ink-soft px-4 py-2 text-[13px] font-medium text-ink"
      >
        Cambiar atleta
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Smoke build**

Run: `npx next build`
Expected: build succeeds, `/profile` listed.

- [ ] **Step 3: Commit**

```bash
git add components/profile/AthleteCard.tsx
git commit -m "feat(profile): AthleteCard shows real avatar + inline upload

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Optional avatar in `<GreetingHeader>`

**Files:**
- Modify: `components/home/GreetingHeader.tsx`

- [ ] **Step 1: Update the component**

Replace `components/home/GreetingHeader.tsx` with:
```tsx
'use client';

import Link from 'next/link';
import { AvatarCircle } from '@/components/profile/AvatarCircle';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';
import { getMoodTokens, type Mood } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

export interface GreetingHeaderProps {
  athlete: Athlete;
  now?: Date;
  todayMood: Mood;
}

export function GreetingHeader({ athlete, now = new Date(), todayMood }: GreetingHeaderProps) {
  const { profile } = useAthleteProfile(athlete);
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
      <Link href="/profile" aria-label="Ir al perfil">
        <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={40} />
      </Link>
    </header>
  );
}
```

- [ ] **Step 2: Update its existing test (removes the bell expectation)**

Replace `__tests__/components/home/GreetingHeader.test.tsx` with:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GreetingHeader } from '@/components/home/GreetingHeader';

vi.mock('@/lib/hooks/use-athlete-profile', () => ({
  useAthleteProfile: () => ({ profile: { athlete: 'MK', avatar_url: null }, loading: false, refresh: vi.fn() }),
}));

describe('GreetingHeader', () => {
  it('shows Buenos días for morning hours', () => {
    render(<GreetingHeader athlete="MK" now={new Date('2026-05-28T08:00:00')} todayMood="joyful" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Buenos días, MK/);
  });

  it('shows Buenas tardes for afternoon hours', () => {
    render(<GreetingHeader athlete="Xabi" now={new Date('2026-05-28T17:00:00')} todayMood="happy" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Buenas tardes, Xabi/);
  });

  it('shows the logged mood label as subtitle', () => {
    render(<GreetingHeader athlete="MK" now={new Date('2026-05-28T10:00:00')} todayMood="sleepy" />);
    expect(screen.getByText(/Adormilado/)).toBeInTheDocument();
  });

  it('links the avatar circle to /profile', () => {
    render(<GreetingHeader athlete="MK" now={new Date('2026-05-28T10:00:00')} todayMood="happy" />);
    expect(screen.getByRole('link', { name: /perfil/i })).toHaveAttribute('href', '/profile');
  });
});
```

- [ ] **Step 3: Run tests, then commit**

Run: `npm test -- GreetingHeader` → 4 PASS.
Commit:
```bash
git add components/home/GreetingHeader.tsx __tests__/components/home/GreetingHeader.test.tsx
git commit -m "feat(home): GreetingHeader shows avatar circle linking to profile

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Full verification + deploy

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: all tests pass. New count ≈ 167 (148 previous + new ones from tasks 1–13). Stop and fix anything red.

- [ ] **Step 2: Production build**

Run: `npx next build`
Expected: clean. New routes match the existing set (no new routes were added).

- [ ] **Step 3: Push to origin/main**

Run: `git push origin main`
Expected: push succeeds.

- [ ] **Step 4: Redeploy to Vercel**

Run: `vercel deploy --prod --yes`
Expected: a new production URL printed; aliased to `mkxa.vercel.app`.

- [ ] **Step 5: Smoke production**

Run:
```bash
curl -sf https://mkxa.vercel.app/pick -o /dev/null -w "/pick: %{http_code}\n"
curl -sf https://mkxa.vercel.app/profile -o /dev/null -w "/profile: %{http_code}\n"
curl -sf https://mkxa.vercel.app/home -o /dev/null -w "/home: %{http_code}\n"
```
Expected: all `200`.

- [ ] **Step 6: Manual mobile smoke (notes only)**

Open `https://mkxa.vercel.app/pick` on a phone:
1. Wordmark MKXA visible with teal MK + lime XA.
2. Two tiles, each with avatar + streak number.
3. Tap the small camera overlay on MK's tile → file picker opens → pick a selfie → it crops + uploads + the tile updates within ~2 s.
4. Tap the body of Xabi's tile → goes to `/home`.
5. Trigger the mood check-in (if today already logged, open Profile → "Reiniciar mood de hoy") → slider drags smoothly, background interpolates, Confirm saves the mood.

If anything fails this manual run, file findings as new tasks; don't blindly mark this step complete.

---

## Self-review checklist (run after writing the plan, before execution)

- ✅ **Spec coverage:**
  - DB table + bucket (§4) → Task 4.
  - `MOOD_ORDER` (§5.1) → Task 1.
  - `lerpHex` (§5.3) → Task 2.
  - `computeWeekStreak` (§5.2) → Task 3.
  - `useAthleteProfile` + `useAvatarUpload` (§5.4–5.5) → Tasks 5 + 9 (upload lives in the button to avoid splitting the upload state across two files).
  - `useWeekStreak` (§5.6) → Task 6.
  - `<MKXALogo>` (§6.1) → Task 7.
  - `<AvatarCircle>` (§6.2) → Task 8.
  - `<AvatarUploadButton>` (§6.3) → Task 9.
  - `<AvatarTile>` (§6.4) → Task 10.
  - `<MoodSlider>` (§6.5) → Task 12.
  - `MoodCheckIn` swap (§6.6) → Task 13.
  - `<AthleteCard>` update (§6.6) → Task 14.
  - `<GreetingHeader>` update (§6.6) → Task 15.
  - Pick screen rewrite (§7) → Task 11.
  - Tests covering pure helpers + visual primitives + slider keyboard (§9) → Tasks 1–9, 12, 13, 15.
  - Deploy (§ — implicit) → Task 16.
  - Out-of-scope items (§10) are intentionally absent.

- ✅ **No placeholders.** Every code block is concrete; every command shows expected output; no "TODO" / "TBD" / "implement later".

- ✅ **Type consistency.** `Mood`, `Athlete`, `AthleteProfile`, `CompletedRow`, `MoodSliderProps`, `AvatarUploadButtonProps` are each defined once and re-imported. `useAthleteProfile` returns `{ profile, loading, refresh }` in every consumer (Tasks 10, 14, 15). `useWeekStreak` returns `{ streak, loading }` in every consumer (Tasks 6 + 10).

- ✅ **TDD.** Every behavioural unit (helpers, hooks, MKXALogo, AvatarCircle, AvatarUploadButton, MoodSlider, MoodCheckIn, GreetingHeader) has its failing test written before the implementation. Purely compositional units (AvatarTile, Pick page) are covered through smoke build + manual mobile run.

- ✅ **DRY.** `lerpHex` lives in `lib/color.ts`. `getMoodTokens` is the single source of mood color. `AvatarCircle` is reused 3× (tile, profile card, greeting). `MoodBlob` is reused inside `MoodSlider` for both hero and thumb.

- ✅ **YAGNI.** No cropper UI, no haptics, no avatar history, no analytics — all explicitly deferred in spec §10.

- ✅ **Frequent commits.** Each of tasks 1–15 ends in its own commit; task 16 pushes + deploys.
