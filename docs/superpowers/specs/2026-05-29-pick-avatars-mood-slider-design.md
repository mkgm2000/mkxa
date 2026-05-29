# Pick Avatars + Mood Slider Design Spec

**Date:** 2026-05-29
**Status:** Approved (brainstorming complete, pending writing-plans)
**Owner:** Xabi
**Stakeholders:** Xabi, MK
**Repo:** https://github.com/mkgm2000/mkxa

---

## 1. Context

The first deployed pick screen is minimalist: two cards showing a generic `MoodBlob` and the athlete name. The legacy app had selectable avatar icons that gave each athlete identity. The current `MoodCheckIn` daily flow uses a horizontal-scroll `MoodTokenStrip` of 10 mini blobs — functional but visually static.

This spec redesigns two things on the live production app:

1. **Pick screen** → adds an MKXA wordmark logo, per-athlete uploadable photo avatars, and a per-athlete training streak.
2. **Mood selector** inside `MoodCheckIn` → replaces the token strip with a continuous horizontal slider whose thumb is the active mini blob and whose background interpolates smoothly between adjacent mood gradients.

## 2. Goals & non-goals

### Goals
- Pick screen feels personal: each athlete has a real photo and a streak number.
- Avatar upload works both from the pick screen and from `/profile`.
- Mood selection feels fluid and tactile: drag a single thumb left → right across all 10 moods ordered best to worst, with the screen background blending in real time.
- Visual language unchanged from the rest of the app (Mona Sans, mood palette, lucide stroke 1.5, no emojis, no chips).

### Non-goals
- Authenticated avatar uploads. The bucket is intentionally open-policy, matching the rest of the project's RLS posture.
- A draggable cropper UI. Center-crop (cover) covers ~95% of selfies; we ship without manual repositioning and revisit if MK or Xabi complain.
- Multiple avatars or avatar history per athlete. One photo per athlete, upsert overwrites.

## 3. Decisions

| Topic | Decision | Why |
|---|---|---|
| Avatar source | Photo upload from device (`capture="user"` on mobile + file picker on desktop) | Maximum personalisation; matches user expectation. |
| Avatar persistence | Supabase Storage bucket `avatars` (public read) + DB column on a new `athlete_profiles` table | Standard Supabase pattern; survives client clears. |
| Avatar processing | Client-side canvas: 256×256 center-cropped JPEG @ quality 0.85 | Small (~20–40 KB), no server work, no extra dep. |
| Avatar entry points | Pick screen overlay button + Profile "Cambiar foto" button | Two natural touchpoints. |
| MKXA logo colors | Legacy teal `#00C49A` for M+K, lime `#7CB518` for X+A | Sentimental nod to the original; tokens added under `brand.legacy-mk` / `brand.legacy-xa` so they do not pollute the mood palette. |
| Streak metric | Consecutive ISO weeks with at least one `completed=true` session in `registros` | Reuses existing data; "miss a whole week, streak resets" matches HYROX cadence. |
| Mood slider mechanic | Continuous `pos ∈ [0, 1]`; idx = `floor(pos × 10)`; background interpolates between adjacent mood gradients | Fluid feel, single source of truth, easy keyboard support. |
| Mood thumb | Mini `<MoodBlob mood={current} size={56}>` | Reinforces app identity; thumb has personality. |
| Mood order (best → worst) | `joyful → happy → love → sleepy → neutral → annoyed → worried → sad → angry → dizzy` | User choice. Joyful=energy max, dizzy=worst. |
| Replaces | `MoodTokenStrip` is deleted from `MoodCheckIn` (component file may stay if other callers ever land; today only this caller). | Single source of truth for mood picking. |

## 4. Data model

### 4.1 New table `athlete_profiles`

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

-- Pre-seed both athletes so client code can always read a row.
insert into athlete_profiles (athlete) values ('MK'), ('Xabi')
  on conflict (athlete) do nothing;
```

### 4.2 Storage bucket `avatars`

```sql
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Open policies that match the rest of this project.
drop policy if exists "avatars_select" on storage.objects;
create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_write" on storage.objects;
create policy "avatars_write" on storage.objects
  for all using (bucket_id = 'avatars') with check (bucket_id = 'avatars');
```

Object path: `avatars/{athlete}.jpg` (overwritten on each upload). Cache busting handled by appending `?v={epoch_ms}` to the URL stored in `athlete_profiles.avatar_url`.

### 4.3 Migration file

`supabase/migrations/20260529120000_athlete_profiles.sql` — contains the SQL above.

## 5. Library additions

### 5.1 `lib/moods.ts` — add MOOD_ORDER

```ts
export const MOOD_ORDER: readonly Mood[] = [
  'joyful', 'happy', 'love', 'sleepy', 'neutral',
  'annoyed', 'worried', 'sad', 'angry', 'dizzy',
] as const;
```

### 5.2 `lib/streak.ts` — new

```ts
import type { Athlete } from '@/lib/athlete-context';

interface CompletedRow { week: number; day_key: string; completed: boolean | null }

/**
 * Consecutive ISO weeks (counting backwards from the current week) where
 * the athlete completed at least one session. A skipped week (zero
 * `completed=true` rows for that week) breaks the streak.
 */
export function computeWeekStreak(rows: CompletedRow[], currentWeek: number): number {
  const weeks = new Set<number>();
  for (const r of rows) if (r.completed) weeks.add(r.week);
  let streak = 0;
  for (let w = currentWeek; w >= 1; w--) {
    if (weeks.has(w)) streak++;
    else break;
  }
  return streak;
}
```

### 5.3 `lib/color.ts` — new

```ts
/**
 * Linear interpolation between two #rrggbb hex strings.
 * Clamps t to [0,1]. Returns lowercase #rrggbb.
 */
export function lerpHex(a: string, b: string, t: number): string {
  const ct = Math.min(1, Math.max(0, t));
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const lerp = (shift: number, mask: number) => {
    const av = (pa >> shift) & mask;
    const bv = (pb >> shift) & mask;
    return Math.round(av + (bv - av) * ct);
  };
  const r = lerp(16, 0xff);
  const g = lerp(8,  0xff);
  const bl = lerp(0, 0xff);
  return `#${[r, g, bl].map(n => n.toString(16).padStart(2, '0')).join('')}`;
}
```

### 5.4 `lib/hooks/use-athlete-profile.ts` — new

```ts
export interface AthleteProfile { athlete: Athlete; avatar_url: string | null }

export function useAthleteProfile(athlete: Athlete | null) {
  // Read athlete_profiles row, exposes { profile, loading, refresh }.
}
```

### 5.5 `lib/hooks/use-athlete-profile.ts::useAvatarUpload` — new

```ts
export function useAvatarUpload(athlete: Athlete | null) {
  // Returns { uploading, error, openPicker }.
  // openPicker triggers a hidden <input> element mounted in the hook via createPortal,
  // OR exposes an inputRef that the consumer renders.
  // Decision: hook returns a Trigger component so it stays declarative.
}
```

Final shape adopted in implementation: the hook returns `{ uploading, error, openPicker, FileInput }` where `FileInput` is a JSX element the consumer mounts once. This avoids reaching out to imperative portals.

### 5.6 `lib/hooks/use-week-streak.ts` — new

```ts
export function useWeekStreak(athlete: Athlete | null) {
  // Reads `registros` for athlete, calls computeWeekStreak with getCurrentWeek().
  // Returns { streak, loading }.
}
```

## 6. Component additions

### 6.1 `<MKXALogo />` — new
- SVG inline wordmark. Four glyphs M K X A side by side, Mona Sans 800 visual style baked into paths or rendered as `<text>` (use `<text>` since Mona Sans is loaded globally).
- M, K filled with `#00C49A`; X, A filled with `#7CB518`.
- `role="img" aria-label="MKXA"`.
- Props: `size?: number = 80` (height in px), `className?`.
- Used in pick screen, optionally in greeting later.

### 6.2 `<AvatarCircle />` — new (lib visual primitive)
- Props: `athlete: Athlete; src: string | null; size?: number = 72; className?`.
- If `src` and image loads: `<img>` rounded-full object-cover.
- Else: bg from `getMoodTokens(athlete === 'MK' ? 'love' : 'joyful').bodyMid`; centered ink initials ("MK" or "X") in Mona Sans 800 sized to ~0.5×size.
- `onError` on `<img>` flips to the initials fallback.

### 6.3 `<AvatarUploadButton />` — new
- Renders the camera overlay button + the hidden file input.
- Props: `athlete: Athlete; currentUrl: string | null; onUploaded: (url: string) => void; variant: 'overlay' | 'inline'`.
- `overlay`: 28×28 circle bg `ink` with `<Camera 14>` white, absolute positioned at bottom-right of an AvatarCircle. Use the consumer's relative wrapper.
- `inline`: full-width row with `<Pencil 14>` + "Cambiar foto" text. Used in Profile.
- Internal logic:
  - File input `accept="image/*"` `capture="user"` (mobile triggers front camera by preference, falls back to gallery).
  - On select: 2MB + MIME guard → read as Image → draw on offscreen canvas 256×256 with cover crop → `toBlob('image/jpeg', 0.85)` → upload to Storage `avatars/{athlete}.jpg` with `upsert: true`, `cacheControl: '0'` → fetch public URL → upsert `athlete_profiles.avatar_url = `${publicUrl}?v=${Date.now()}` → call `onUploaded(newUrl)` and `saveState.set('saved')`.
- Spinner state while uploading (the camera glyph swaps for a small spinning ring).

### 6.4 `<AvatarTile />` — new
- The card on the pick screen. Props: `athlete: Athlete`.
- Composition:
  - Outer button: `rounded-card bg-white p-4 shadow-card flex items-center gap-4 w-full max-w-md active:scale-[0.98]`.
  - Left: relative wrapper with `<AvatarCircle athlete size={72} src={url} />` + `<AvatarUploadButton variant="overlay" ... />`.
  - Right column:
    - Eyebrow Mona Sans Bold 11px tracking 0.08em uppercase muted: "ATLETA"
    - Name Mona Sans 800 28px ink letter-spacing tightest
    - Streak row Mona Sans Medium 13px ink-muted: `<Flame 14 strokeWidth=1.5>` + `${streak} sem.`
- Tap on the card (not the avatar overlay) calls `setAthlete(athlete)` then `router.push('/home')`.

### 6.5 `<MoodSlider />` — new
- Props: `value: Mood; onChange: (m: Mood) => void; className?`.
- Internal state `pos ∈ [0, 1]`, initialised from `value` (centered on the index).
- Sub-elements:
  - Hero `<MoodBlob mood={MOOD_ORDER[idx]} size={280} animate withFloor withParticles />` centered, fade-in on idx change (key prop = mood string).
  - Label Mona Sans 800 24px ink centered = `getMoodTokens(MOOD_ORDER[idx]).label`.
  - Track: a 12px-high `rounded-full` div whose background is a `linear-gradient(to right, …)` of all 10 `bodyMid` colors at fixed stops.
  - Thumb: positioned via `style.left = ${pos*100}%; transform: translateX(-50%);`. Contains a mini `<MoodBlob mood={MOOD_ORDER[idx]} size={56} animate={false} withFloor={false} withParticles={false} />`.
  - Extremes row: "Mejor" left, "Peor" right, 11px muted bold.
  - Optional dynamic background: emits a CSS variable `--mood-bg` on the outer wrapper that `MoodCheckIn` consumes for the page background; computed each frame as `lerpHex(getMoodTokens(MOOD_ORDER[idx]).cardFrom, getMoodTokens(MOOD_ORDER[idx+1] ?? last).cardFrom, t)` etc.
- Gestures:
  - Pointer events (`onPointerDown` on the track, `setPointerCapture`, `onPointerMove` updates pos).
  - On `pointerUp` the captured pointer releases; do not snap.
  - Keyboard: track is `role="slider"` `tabIndex=0`. ← →: pos ± 0.05 clamp [0,1]. Home/End: 0/1. Shift+arrow: ±0.2.
- Reduced motion: if `prefers-reduced-motion: reduce`, background becomes the discrete `MoodGradientBg` of the active mood; hero blob still renders but no particles.
- `onChange` fires only when `idx` changes, not on every pixel.

### 6.6 Updates to existing components
- `components/mood/MoodCheckIn.tsx` — replace `<MoodTokenStrip>` with `<MoodSlider>`. Drop the outer `<MoodGradientBg>` — the slider drives the page background dynamically. Keep the `<WaveDecoration>` above the slider. Remove the standalone hero blob (the slider owns it).
- `components/mood/MoodTokenStrip.tsx` — keep file (other future callers might use it) but remove its test if it becomes orphan. Decision: keep both file and test.
- `components/profile/AthleteCard.tsx` — replace the hard-coded `<MoodBlob>` with `<AvatarCircle>` (uses `useAthleteProfile`) and add an inline `<AvatarUploadButton variant="inline" />` below the name.
- `components/home/GreetingHeader.tsx` — accept an optional `avatarUrl: string | null` prop; replace the bell `<HeaderActionButton>` slot with a smaller `<AvatarCircle size={40} />` on the right that links to `/profile`. The bell moves out of view for now; it had no functionality.
- `app/pick/page.tsx` — full rewrite to the new layout described in §7.

## 7. Pick screen layout

```
<MoodGradientBg mood="neutral">
  <main flex column items-center justify-center min-h-dvh px-6 gap-8>
    <MKXALogo size={80} />
    <h1 Mona 800 28px>"¿Quién entra?"</h1>
    <div flex column gap-3 w-full max-w-md>
      <AvatarTile athlete="MK" />
      <AvatarTile athlete="Xabi" />
    </div>
    <InlineSaveText />            {/* picks up upload status */}
  </main>
</MoodGradientBg>
```

Safe area padding via `style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}` on `main`.

## 8. Edge cases

| Case | Handling |
|---|---|
| `athlete_profiles` row missing | Hook returns `avatar_url: null` → fallback initials |
| `avatar_url` 404 | `<img onError>` → fallback initials |
| Upload mid-flow → user navigates away | Hook cancels with abort guard; partial uploads acceptable (Storage stores overwritten file) |
| User picks a non-image file via file picker | `image/*` filter on accept, plus MIME guard re-checks |
| Slider drag escapes the track | `setPointerCapture` keeps events bound; pointerup releases |
| Slider with reduced motion | discrete bg + idx changes still respond to drag |
| First mood check-in of the day with slider | Default `pos = 0.4` (halfway between `sleepy` and `neutral`) to avoid biasing the initial selection |

## 9. Tests

Cover with Vitest + RTL:

- `lib/streak.ts::computeWeekStreak` — empty, single, gap, current-week-only, multi-week consecutive, gap-in-middle.
- `lib/color.ts::lerpHex` — pure unit tests across boundary cases (t=0, t=1, t=0.5), clamping outside [0,1].
- `MOOD_ORDER` length === 10, contains all moods exactly once.
- `<AvatarCircle>` — renders `<img>` when `src` provided, renders initials fallback when not, `onError` swap.
- `<MKXALogo>` — renders SVG with `aria-label="MKXA"`.
- `<MoodSlider>` — keyboard arrow steps change idx by ±1; clicking a position changes idx; reports `onChange` only on idx change; `role="slider"` with valid `aria-valuenow`.
- `useWeekStreak` — mocked supabase returns rows, asserts streak number.
- Skip: image cropping pipeline (jsdom canvas is fragile); test the upload wiring with a mocked supabase storage in a higher-level test if time allows.

## 10. Out of scope (deferred)

- Manual cropper UI (drag-to-reposition, pinch-to-zoom).
- Avatar history / undo previous photo.
- Animated transition between picker and home (next phase).
- Haptic feedback on slider — wait until iOS supports `navigator.vibrate` reliably from web.
- Bell icon functionality (notifications).

## 11. Risks

| Risk | Mitigation |
|---|---|
| Canvas resize is slow on older iPhones | 2 MB hard cap on input; user gets a clear error if exceeded; fallback compression at quality 0.7 if first attempt > 100 KB |
| Public bucket means anyone with the URL can download the photo | Risk explicit + accepted; matches existing project posture |
| Slider 60fps re-renders cause jank with MoodBlob | Memoize MoodBlob by mood; only re-render thumb position via inline style (no React re-render of the blob unless mood changes) |
| Continuous background change can be uncomfortable | Throttle the lerp updates to `requestAnimationFrame` |
| Old `MoodTokenStrip` tests reference deleted UI | Keep the strip and its tests as a dead-code-but-tested module; revisit removal once we're sure no future page needs it |

## 12. References

- `docs/superpowers/specs/2026-05-28-mkxa-life-app-design.md` — original spec, §4 visual system, §5 architecture.
- `public/legacy/index.html` — wordmark and athlete icons.
- ui-ux-pro-max review confirms Claymorphism / Organic Biophilic style still applies; no token changes required.
