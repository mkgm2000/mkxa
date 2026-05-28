# MKXA — Life App Design Spec

**Date:** 2026-05-28
**Status:** Approved (brainstorming phase complete, pending writing-plans)
**Owner:** Xabi
**Stakeholders:** Xabi, MK
**Repo:** https://github.com/mkgm2000/mkxa

---

## 1. Context & motivation

The current `mkxa` repo is a single `index.html` vanilla HTML/CSS/JS file (~40KB) that MK and Xabi use to track their HYROX training plan, backed by Supabase. It works but does not scale: adding new features (mood tracking, expenses, receipts, meal planning) on top of a monofile with no auth, no component model and an exposed anon key is unsustainable.

This spec defines a full pivot: **mkxa becomes a shared life-companion app for MK and Xabi** — a mobile-first daily dashboard that bundles training, mood, expenses with OCR receipt capture, and weekly meal planning with TikTok recipe ingestion and an interactive shopping list. The training functionality is preserved 1:1; the rest is new.

## 2. Goals & non-goals

### Goals
- Migrate to a maintainable stack (Next.js + TypeScript + Tailwind + Supabase) while preserving 100% of current HYROX training behaviour.
- Adopt a unified visual language built from the user-supplied "Mood Characters" handoff (10 animated SVG mood blobs) + 3 reference screen mockups (gradient backgrounds, white rounded cards, segmented controls, floating bottom nav).
- Daily mood check-in as the recurring hook: every first open of the day prompts the user; the chosen mood tints the rest of the UI.
- Shared expense tracking for the couple with manual entry and AI-assisted receipt OCR.
- Meal planning workflow tailored to MK's current process: capture recipes from TikTok in one tap, plan the week, auto-generate a categorised interactive shopping list, optionally cook step-by-step with timers, and convert the finished shopping run into an expense automatically.
- Deploy on Vercel with the existing Supabase project.

### Non-goals
- Auth (intentional). Athlete picker (MK / Xabi) only, no email/password/magic link. Risk accepted — URL kept private between two people.
- Multi-tenant or public access. The app is for two specific users.
- Native mobile app. Web only, mobile-first.
- TikTok video scraping. Recipes are captured via user-provided screenshot + pasted caption + URL.
- Backwards compatibility with the legacy `index.html` API. The HYROX `registros` Supabase table schema is preserved; the rest is greenfield.

## 3. Decisions

| Topic | Decision | Why |
|---|---|---|
| Stack | Next.js 14+ App Router · TypeScript · Tailwind · shadcn/ui · Supabase · Vercel | Matches user's existing toolchain (LinceReservations, AutomatizacionesDOT). Component model + routing + RSC. |
| Font | Mona Sans (self-hosted woff2) | Reference design specifies Gilroy; Mona Sans is the closest OFL-licensed geometric sans. User-approved. |
| Visual system | 10 mood blob characters from the user-supplied "Mood Characters" handoff (`docs/design-handoff/mood_characters/`) | Bespoke handoff with full SVG paths, gradients, animations and tokens. |
| Backgrounds | Full-screen 170° linear gradient that adapts to the mood of the day (or section-specific mood) | Mirrors the reference screen mockups; no flat white surfaces. |
| Auth | None. `localStorage` + React Context athlete selector | User explicitly chose this trade-off. |
| Mood frequency | One mandatory check-in per athlete per day, gated at first open | Most data per day without becoming a nag. |
| Expense visibility | Shared across the couple. Field `paid_by ∈ {MK, Xabi, Compartido}` | Couple use case. |
| Expense categories | Fixed set: Comida, Casa, Transporte, Ocio, Salud, Suscripciones, Otros | Fast MVP, room to extend later. |
| OCR provider | Anthropic Claude Sonnet 4.6 (vision) for both receipts and recipes | Single vendor; reusable system prompts; prompt caching available. |
| Repo strategy | Reuse `mkxa` repo, reset to Next.js, move current `index.html` to `legacy/index.html` | Preserves history and URL. |
| Bottom navigation | 5 tabs: Home / Training / Comidas / Gastos / Perfil | Adding meals required 5 tabs; Material allows 3–5. |
| Iconography | `lucide-react` only, stroke-width 1.5 | One consistent set; no emojis; no mixing icon libraries. |
| No emojis policy | Strict, everywhere, including category indicators and empty states | User explicit instruction. |
| No generic chips/badges | Custom `<CategoryDot>` / `<CategoryColorBar>` instead of shadcn Badge | User explicit instruction. |
| Animation library | CSS modules only, no framer-motion | Handoff is CSS keyframes; framer-motion adds weight for no gain. |

## 4. Visual system

### 4.1 Reference materials
- `docs/design-handoff/mood_characters/Mood Characters.html` — high-fidelity HTML/CSS/SVG handoff. **Source of truth** for blob geometry, gradients, animations and per-mood tokens. Recreate pixel-perfect.
- `docs/design-handoff/mood_characters/README.md` — handoff documentation.
- Three reference mockup screenshots provided by the user (yellow check-in, green dashboard, lilac history). **Source of truth** for screen-level composition: gradient backgrounds, big bold dark headers, white rounded cards with soft shadows, segmented control with black active pill, week-dots row with coloured circles, action card with blob + title + duration + arrow, floating bottom navigation pill with four line-art icons, top-right circular header action button.

### 4.2 Compromise: what is taken 1:1 from references

| From mockups | Used in MKXA as |
|---|---|
| Full-screen 170° linear gradient backgrounds (per mood) | Every screen's background, tinted by current mood / module |
| Big bold dark headers (Mona Sans 800 / 40px / letter-spacing -0.025em) | Page titles |
| Top-right circular header action button (e.g. notification bell with red dot) | `<HeaderActionButton>` slot for bell, plus, back, more |
| Segmented control with black active pill (Month / Week / Day) | `<SegmentedDayWeekMonth>` used in Home and Expenses |
| Week dots row (M T W T F S S with coloured number circles) | Home's mood-week visualiser; Training's session-week visualiser |
| White cards radius 28–36px with soft shadow `0 24px 50px -28px rgba(20,24,30,0.28)` | All cards |
| Mini chart inside card (line / bars), no axes, no grid | Home widgets |
| Action card "blob on the left + title + subtitle + duration + arrow" | `<CardNextSession>`, Profile explore cards |
| Floating white bottom navigation pill with four line-art icons | `<BottomNav>` (MKXA extends to 5 icons) |
| Bottom selector with one item highlighted on light pill (Great / Good / Neutral) | `<MoodTokenStrip>` adapted to 10 moods via horizontal scroll |

### 4.3 What is taken 1:1 from the Mood Characters handoff

- 10 moods: Happy, Joyful, Annoyed, Worried, Dizzy, Sad, Angry, In love, Sleepy, Neutral.
- Shared egg-shaped body SVG path on viewBox `0 0 220 220`.
- Per-mood body linear gradient (3 stops 0/55/100%), card background gradient (170° linear, 2 stops), face elements, mood-specific animation, ambient particles.
- Common ink colour `#1b1d1f`.
- Card radius 36px, soft shadow + inset highlight + grain noise overlay (`::after` 3x3px radial dot pattern, `mix-blend-mode: multiply`, opacity 0.6).
- All animation keyframes: `float`, `breathe`, `floor-pulse`, `float-happy`, `float-joy`, `eye-roll`, `sway`, `mouth-quiver`, `wobble`, `spin`, `droop`, `tear-fall`, `angry-shake`, `love-pulse`, `heart-thump`, `sparkle`, `heart-float`, `zee-rise`, `steam-rise`, `sweat-drip`, `pulse`.
- `prefers-reduced-motion: reduce` kill-switch preserved.
- DM Sans token in the handoff is substituted with Mona Sans in production (same metrics, OFL licence).

### 4.4 Mood ↔ module mapping

| Module | Hero mood blob | Screen gradient |
|---|---|---|
| Mood Check-In | User's live selection | User's live selection |
| Home dashboard | Today's logged mood | Today's mood gradient |
| Training | Joyful | `#d6f5ea → #8de2c9` |
| Comidas | Happy | `#fff4d8 → #ffd987` |
| Cook mode | In love | `#ffe2ec → #ffa3bc` |
| Shopping list | Neutral | `#f0eee9 → #d6cfc1` |
| Expenses list | Neutral | `#f0eee9 → #d6cfc1` |
| Expense over threshold | Worried | `#fff1d6 → #ffd07a` |
| Profile | In love | `#ffe2ec → #ffa3bc` |

### 4.5 Design tokens (Tailwind)

```ts
colors: {
  ink:        '#1b1d1f',
  'ink-muted': 'rgba(27,29,31,0.45)',
  'ink-soft':  'rgba(27,29,31,0.15)',
  danger:     '#ff3b30',
  mood: { /* 10 moods, see handoff per-mood table */ },
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
  pill:   '999px',
  action: '16px',
},
boxShadow: {
  card:   '0 1px 0 rgba(255,255,255,0.55) inset, 0 24px 50px -28px rgba(20,24,30,0.28)',
  item:   '0 2px 8px -4px rgba(0,0,0,0.05)',
  nav:    '0 8px 24px -8px rgba(0,0,0,0.10)',
  action: '0 4px 12px -4px rgba(0,0,0,0.10)',
},
fontFamily: {
  sans: ['var(--font-mona)', 'system-ui', 'sans-serif'],
},
```

### 4.6 Iconography (lucide-react, stroke 1.5)

| Concept | Component |
|---|---|
| Notifications | `Bell` |
| Home tab | `Home` |
| Training tab | `Dumbbell` |
| Meals tab | `ChefHat` |
| Expenses tab | `Wallet` |
| Profile tab | `User` |
| Add | `Plus` |
| Camera | `Camera` |
| Manual entry | `PenLine` |
| Time of day | `Clock` |
| Duration | `Hourglass` |
| Streak | `Flame` |
| Back | `ChevronLeft` |
| Confirm | `Check` |
| Close | `X` |
| External link | `ArrowUpRight` |
| Recipe | `BookOpen` |
| Recipe link | `Link2` |
| Screenshot | `Image` |
| Plan week | `CalendarDays` |
| Shopping cart | `ShoppingCart` |
| Item unchecked | `Circle` |
| Item checked | `CheckCircle2` |
| Pantry | `Package2` |
| Timer | `Timer` |

## 5. Architecture

### 5.1 Stack
- Next.js 14+ App Router, TypeScript
- Tailwind CSS, shadcn/ui base primitives (only where they don't conflict with the bespoke visual system)
- Supabase JS v2 client (existing project `jxyqbtttgpdokotmbeud`), Storage for receipt images
- Anthropic SDK server-side for OCR
- Mona Sans self-hosted via `next/font/local`
- Recharts for the small line + bar widgets
- Zustand for global UI state (athlete, mood today, save state)
- Vercel deploy

### 5.2 Repository layout (target)

```
mkxa/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                       # redirect → /pick or /home
│   ├── pick/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                 # MoodGate + BottomNav
│   │   ├── home/page.tsx
│   │   ├── training/page.tsx
│   │   ├── training/progress/page.tsx
│   │   ├── meals/page.tsx             # tabs: Semana | Recetas | Compra | Despensa
│   │   ├── meals/scan/page.tsx
│   │   ├── meals/recipes/page.tsx
│   │   ├── meals/recipes/new/page.tsx
│   │   ├── meals/recipes/[id]/page.tsx
│   │   ├── meals/week/page.tsx
│   │   ├── meals/shopping/page.tsx
│   │   ├── meals/pantry/page.tsx
│   │   ├── meals/cook/[id]/page.tsx
│   │   ├── expenses/page.tsx
│   │   ├── expenses/new/page.tsx
│   │   ├── expenses/scan/page.tsx
│   │   ├── expenses/[id]/page.tsx
│   │   └── profile/page.tsx
│   └── api/
│       ├── ocr-receipt/route.ts
│       └── meals/
│           ├── extract-recipe/route.ts
│           ├── generate-shopping/route.ts
│           └── finish-shopping/route.ts
├── components/
│   ├── mood/{MoodBlob,MoodCheckIn,MoodGate,MoodGradientBg,MoodTokenStrip,moods}.{tsx,ts}
│   ├── nav/{BottomNav,HeaderActionButton}.tsx
│   ├── feedback/{InlineSaveText}.tsx
│   ├── controls/{SegmentedDayWeekMonth,CategoryDot,CategoryColorBar,CategorySelect,PaidBySelect}.tsx
│   ├── home/{GreetingHeader,WeekMoodDotsRow,WidgetMoodChart,WidgetExpenseMonth,WidgetTrainingStreak,CardNextSession}.tsx
│   ├── training/{WeekHeader,SessionCard,BlockRow,RpeModal,ProgressHeatmap}.tsx
│   ├── expenses/{ExpenseList,ExpenseCard,ExpenseForm,ReceiptCapture,OcrPreview}.tsx
│   ├── meals/{RecipeCaptureForm,ScreenshotDropZone,RecipeReview,RecipeCard,RecipeDetail,CookStepper,CookTimer,WeekPlanBoard,DaySlotCard,RecipePickerSheet,ShoppingList,ShoppingItemRow,ShoppingSectionHeader,FinishShoppingSheet,PantryList,PantryItemRow}.tsx
│   ├── profile/{AthleteCard,MoodHistoryChart,ExploreCards}.tsx
│   └── ui/                            # shadcn primitives kept as-is (Sheet, Select)
├── lib/
│   ├── supabase/{client,server}.ts
│   ├── athlete-context.tsx
│   ├── plan-hyrox.ts                  # ported from index.html
│   ├── training-colors.ts             # ported RC map
│   ├── meals/aggregate-shopping.ts
│   └── anthropic/{client,prompts}.ts
├── public/fonts/MonaSans-*.woff2
├── supabase/migrations/
│   ├── 20260528120000_mood_logs.sql
│   ├── 20260528120100_expenses_and_storage.sql
│   ├── 20260528120200_meals.sql
│   └── 20260528120300_shopping_and_pantry.sql
├── legacy/index.html                  # the original
├── docs/
│   ├── design-handoff/mood_characters/
│   └── superpowers/specs/
└── tailwind.config.ts
```

### 5.3 Runtime patterns
- **Athlete context:** `lib/athlete-context.tsx` holds `MK | Xabi`, persisted in `localStorage`. Redirect: `/` → `/home` if athlete set, `/pick` otherwise.
- **MoodGate:** wraps `(app)/layout.tsx`. On mount checks `mood_logs.where(athlete, date=today).maybeSingle()`. If null → renders `<MoodCheckIn>` modal full-screen. Once saved, exposes `useMoodToday()` to children and wraps content in `<MoodGradientBg mood={todayMood}>`.
- **Supabase client:** anon key in browser (matches current pattern). RLS open. Storage bucket `receipts` private with signed URLs.
- **Save feedback:** Zustand store with `state ∈ {idle, saving, saved, error}` → `<InlineSaveText>` renders subtly under page headers. Replaces the legacy yellow/green sync pill.

## 6. Data model

Existing table `registros` is preserved unchanged. New tables and bucket:

### 6.1 `mood_logs`
```sql
create table mood_logs (
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
create index mood_logs_athlete_date_idx on mood_logs (athlete, date desc);
```

### 6.2 `expenses`
```sql
create table expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'EUR',
  category text not null check (category in (
    'comida','casa','transporte','ocio','salud','suscripciones','otros'
  )),
  date date not null,
  paid_by text not null check (paid_by in ('MK','Xabi','Compartido')),
  description text,
  merchant text,
  receipt_url text,
  receipt_data jsonb,
  created_by text not null check (created_by in ('MK','Xabi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_date_idx     on expenses (date desc);
create index expenses_category_idx on expenses (category, date desc);
create index expenses_paid_by_idx  on expenses (paid_by, date desc);

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger expenses_updated_at
  before update on expenses
  for each row execute function set_updated_at();
```

### 6.3 Meals
```sql
create table recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  source_type text check (source_type in ('tiktok','manual','instagram','web','other')),
  image_url text,
  prep_minutes int,
  servings int default 2,
  tags text[] default '{}',
  notes text,
  created_by text check (created_by in ('MK','Xabi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  aisle text check (aisle in (
    'frutas_verduras','pescaderia','carniceria','lacteos',
    'panaderia','despensa','congelados','bebidas','limpieza','otros'
  )) default 'otros',
  optional bool default false,
  position int default 0
);
create index recipe_ingredients_recipe_idx on recipe_ingredients(recipe_id);

create table recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  position int not null,
  body text not null,
  timer_min int,
  unique(recipe_id, position)
);

create table meal_plan (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  day text not null check (day in ('mon','tue','wed','thu','fri','sat','sun')),
  slot text not null check (slot in ('breakfast','lunch','dinner','snack')),
  recipe_id uuid references recipes(id) on delete set null,
  servings int default 2,
  done bool default false,
  unique(week_start, day, slot)
);
create index meal_plan_week_idx on meal_plan(week_start);

create table pantry_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  aisle text not null,
  in_stock bool default true,
  updated_at timestamptz not null default now()
);

create table shopping_list (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  name text not null,
  quantity numeric,
  unit text,
  aisle text not null,
  source text check (source in ('plan','manual')) default 'plan',
  recipe_ids uuid[] default '{}',
  checked bool default false,
  archived bool default false,
  position int default 0,
  created_at timestamptz not null default now()
);
create index shopping_list_week_idx on shopping_list(week_start, archived);
```

### 6.4 Storage
Bucket `receipts`, private, signed URLs 7 days, path `{created_by}/{expense_id}.{ext}`, max 5 MB, accepts `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.

### 6.5 RLS
All new tables and the bucket get an open policy `for all using (true) with check (true)` to match the existing pattern. Risk is explicit and accepted; can be tightened later without schema change.

## 7. Module specs

### 7.1 Mood check-in
- Trigger: `MoodGate` detects no `mood_logs` row for `(athlete, today)`.
- Layout: full-screen `MoodGradientBg` tinted by the currently focused mood; big header "¿Cómo estás realmente hoy?"; centred hero `<MoodBlob size={280} animate withParticles withFloor>`; `<WaveDecoration>` static SVG audio-wave; horizontal-scroll `<MoodTokenStrip>` with 10 mini blobs (size 72, snap-x, label Mona Sans Medium 13px); confirm button = `<HeaderActionButton icon={Check}>` top right.
- Selection: tapping a token raises the chosen blob as hero, scales token to 1.08, dims others to opacity 0.5, recolors background. Confirm writes `mood_logs` upsert and dismisses.
- Re-entry: the gate is bypassed once today's mood exists; users can change it manually from Profile.

### 7.2 Home dashboard
Mirrors the green reference screen, content adapted:
- `<GreetingHeader>` "Buenos días, {athlete}, ¿qué tal hoy?" + `<HeaderActionButton icon={Bell} dot>`.
- `<SegmentedDayWeekMonth>` (default Week) with sliding black active pill.
- `<WeekMoodDotsRow>` — labels L M X J V S D, 36px solid circles coloured by that day's logged mood, today gets a 2px ink ring, future days are outlined-empty.
- Two-column widget grid: `<WidgetMoodChart>` (line, 7 days) + `<WidgetExpenseMonth>` (bar, top 3 categories).
- `<CardNextSession>` — joyful blob 80px on the left, "Próxima sesión / HYROX · Fuerza / `<Clock>` 14:00 hoy".
- `<WidgetTrainingStreak>` — `<Flame>` icon + Mona Sans 800/32px count.

### 7.3 Training
Lifted 1:1 from `legacy/index.html`, restyled to the new system.

| Legacy JS | New TS |
|---|---|
| `const PLAN = {1:{MK:[...], Xabi:[...]}, 2:..., 3:...}` | `lib/plan-hyrox.ts` typed export |
| `const START_DATE`, `getCurrentWeek()`, `getDays()` | `lib/plan-hyrox.ts` helpers |
| `const RC = {1..10: hex}` | `lib/training-colors.ts` |
| `loadDB()`, `saveDB()`, `setLog()` | `useTraining()`, `useTrainingMutations()` hooks |
| Inline RPE modal | `<RpeModal>` Sheet with 10 colour chips (48×48), ink ring on selected |
| Sync dot pill | global `<InlineSaveText>` |
| Heatmap table | `<ProgressHeatmap>` (radius 6px cells, gap 2px) |

Functional parity is the acceptance bar. Side-by-side regression test against `legacy/index.html`.

### 7.4 Comidas
Four internal tabs at `/meals`: Semana / Recetas / Compra / Despensa.

**Capture (`/meals/scan`):** paste TikTok URL, optionally upload a screenshot, optionally paste caption text. POST `/api/meals/extract-recipe` returns structured JSON (title, prep_minutes, servings, tags, ingredients[], steps[], confidence). `<RecipeReview>` shows an editable form prefilled from the JSON; on confirm, insert into `recipes` + `recipe_ingredients` + `recipe_steps`.

**Library (`/meals/recipes`):** grid of `<RecipeCard>` (image, title, prep minutes, tag dots). Filter by tag. Detail page shows full recipe with "Añadir a esta semana" CTA and "Cocinar" link to `/meals/cook/[id]`.

**Week plan (`/meals/week`):** seven day-rows × {Lunch, Dinner} (configurable in Profile). Each slot is a `<DaySlotCard>` — tap empty slot opens `<RecipePickerSheet>`, tap filled slot opens edit sheet. Bottom CTA "Generar lista compra".

**Shopping (`/meals/shopping`):** sections by aisle in supermarket-flow order; `<ShoppingItemRow>` with circle/check-circle toggle, name strikethrough on check, "de: {recipe titles}" subtitle. Bottom CTA "Finalizar compra" opens `<FinishShoppingSheet>` to enter total and creates an `expenses` row with `category=comida`, archives the list.

**Pantry (`/meals/pantry`):** simple toggle list; in-stock items are excluded from future shopping list generation.

**Cook (`/meals/cook/[id]`):** stepper with current step text, `<CookTimer>` (tabular-nums, wake-lock, audio chime on finish, fallback `nosleep.js`), prev/next nav.

### 7.5 Gastos
- `/expenses` lists `<ExpenseCard>` rows sorted by date desc, with `<CategoryColorBar>` (4px vertical, left edge), merchant + amount on the first line, "category · paid_by · date" on the second. Total header for the active period filtered by `<SegmentedDayWeekMonth>`.
- `<HeaderActionButton icon={Plus}>` opens bottom Sheet with two option cards: "Escanear factura" (`<Camera>`) → `/expenses/scan`; "Añadir manual" (`<PenLine>`) → `/expenses/new`.
- Scan flow: `<ReceiptCapture>` (camera input on mobile, drag-drop on desktop) → upload base64 → POST `/api/ocr-receipt` → `<OcrPreview>` editable form prefilled → upload image to Storage → insert `expenses` row.
- New manual flow: `<ExpenseForm>` with amount (big input, EUR suffix), date, merchant, `<CategorySelect>`, `<PaidBySelect>` (radio horizontal MK / Xabi / Compartido), note textarea.

### 7.6 Perfil
Atleta avatar (`<MoodBlob mood="love" size={80}>`), "Cambiar atleta" link to `/pick`, `<MoodHistoryChart>` (line, last 14 days), `<ExploreCards>` 2×2 grid mirroring the reference "Tests to understand the reasons" layout with relevant content for MKXA: Balance del mes, Mood vs Training, Racha actual, Top categorías. Settings list at the bottom: theme (auto/light/dark), reset today's mood, open `legacy/index.html`.

## 8. Server routes & AI

| Route | Purpose | Caching |
|---|---|---|
| `POST /api/ocr-receipt` | Claude vision → `{total, date, merchant, category_suggested, items[], confidence}` | System prompt marked `cache_control: ephemeral` |
| `POST /api/meals/extract-recipe` | Claude vision + text → recipe JSON | System prompt cached |
| `POST /api/meals/generate-shopping` | Pure DB: aggregate ingredients across `meal_plan` for week, subtract pantry, order by aisle, upsert `shopping_list` | n/a |
| `POST /api/meals/finish-shopping` | Atomic: insert `expenses`, archive `shopping_list` | n/a |

Anthropic SDK initialised once per server route with `ANTHROPIC_API_KEY`. Model: `claude-sonnet-4-6`. Output is strict JSON (validated with `zod` server-side before returning to client).

### Receipt system prompt (canonical)
```
Eres un extractor de datos de tickets/facturas en español.
Devuelve SOLO JSON sin markdown:
{
  "total": number,         // EUR
  "date": "YYYY-MM-DD",
  "merchant": string,
  "category_suggested": "comida"|"casa"|"transporte"|"ocio"|"salud"|"suscripciones"|"otros",
  "items": [{"name": string, "price": number}],
  "confidence": number     // 0..1
}
Si no detectas un campo: null. Sin texto explicativo.
```

### Recipe system prompt (canonical)
```
Eres un extractor de recetas en español a partir de capturas de TikTok/Instagram + descripción.
Si hay imagen, examina texto overlay y elementos visibles.
Combina con texto si lo hay.

Devuelve SOLO JSON sin markdown:
{
  "title": string,
  "prep_minutes": number|null,
  "servings": number|null,
  "tags": string[],         // máx 4
  "ingredients": [{
    "name": string,         // singular lowercase
    "quantity": number|null,
    "unit": "g"|"ml"|"unidad"|"cda"|"cdita"|"pizca"|"al gusto"|null,
    "aisle": "frutas_verduras"|"pescaderia"|"carniceria"|"lacteos"|"panaderia"|"despensa"|"congelados"|"bebidas"|"otros",
    "optional": boolean
  }],
  "steps": [{
    "body": string,
    "timer_min": number|null
  }],
  "confidence": number      // 0..1
}
Si algo no extraes: null. Sin texto explicativo.
```

## 9. Environment & deploy
```bash
NEXT_PUBLIC_SUPABASE_URL=https://jxyqbtttgpdokotmbeud.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<existing anon key>
ANTHROPIC_API_KEY=<server-only>
```
Vercel: connect `mkgm2000/mkxa`, Next.js framework, preview deploys on every push. `ANTHROPIC_API_KEY` set in Production + Preview + Development scopes.

## 10. Accessibility & quality bar

Per the ui-ux-pro-max pre-delivery checklist applied to this design:
- No emojis as icons; all icons from `lucide-react` stroke 1.5.
- Touch targets ≥ 44 pt: bottom-nav items 56×56, header action buttons 40×40 + padding, RPE chips 48×48.
- Press feedback `scale 0.95→1` on cards and buttons, 120 ms.
- Active nav state: ink fill + label visible + underline indicator that animates in width 0→24px / 200 ms.
- `prefers-reduced-motion: reduce` preserved from the handoff (kills all blob animations).
- Mona Sans loaded with `display: swap` and preloaded for weights 400 / 700 / 800 only.
- Contrast: ink `#1b1d1f` on every mood gradient meets 4.5:1 (verified during implementation against the lightest stop of each).
- Colour is never the only signal: categories combine colour + text; moods combine blob + label.
- Safe-area handled on `<BottomNav>` (`env(safe-area-inset-bottom)`) and headers (`env(safe-area-inset-top)`).

## 11. Implementation phases

| Phase | Scope | Estimate |
|---|---|---|
| 0 | Reset repo, scaffold Next.js, Tailwind tokens, Mona Sans, Vercel | 1–2 d |
| 1 | Design system: `<MoodBlob>` 10 variants, `<MoodGradientBg>`, `<HeaderActionButton>`, `<BottomNav>`, `<SegmentedDayWeekMonth>`, `<InlineSaveText>` | 2–3 d |
| 2 | Athlete picker, `mood_logs`, `<MoodCheckIn>`, `<MoodTokenStrip>`, `<MoodGate>`, Home shell | 2 d |
| 3 | Training port from `legacy/index.html`, hooks, restyle | 3–4 d |
| 4 | Expenses manual, `<ExpenseCard>`, `<CategoryColorBar>`, Home expense widget | 2–3 d |
| 5 | Receipt OCR route + `<ReceiptCapture>` + `<OcrPreview>` + Storage | 2 d |
| 6 | Meals capture: `/api/meals/extract-recipe`, `<RecipeCaptureForm>`, `<ScreenshotDropZone>`, `<RecipeReview>`, library + detail | 3–4 d |
| 7 | Meals week plan: `<WeekPlanBoard>`, `<DaySlotCard>`, `<RecipePickerSheet>` | 2–3 d |
| 8 | Meals shopping + pantry: aggregation route, `<ShoppingList>`, `<PantryList>`, finish→expense | 3 d |
| 9 | Meals cook: `<CookStepper>` + `<CookTimer>` + wake-lock | 1–2 d |
| 10 | Profile + polish (animations, a11y pass, Lighthouse) | 2 d |

**Estimated total:** 25–30 focused work days. Each phase merges independently and is demoable.

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Mona Sans licence | OFL on GitHub repo, verify release before self-host. |
| Many blob animations cost CPU | Single CSS module, GPU-friendly transforms, `prefers-reduced-motion` kill switch. |
| Initial bundle size | Route-level code-split (App Router default); blobs in one module ~30 KB; no framer-motion. |
| No auth ↔ financial data exposed | Risk explicitly accepted by user. Mitigation hook: a future client-side PIN gate before `/expenses` can be added without schema change. |
| OCR confidence low on blurry receipts | Form is always editable post-OCR; fields with `confidence < 0.6` are highlighted. |
| TikTok scraping not permitted | Spec relies on user-supplied screenshot + caption text + URL, never on direct video download. |
| Wake Lock API not in iOS Safari | `nosleep.js` polyfill fallback. |
| Anthropic prompt cache miss after edits | System prompts pinned as exported constants with explicit versioning. |

## 13. Open questions for implementation

None. All design questions were closed during brainstorming. Implementation may surface tactical decisions (e.g. exact bottom-sheet animation curve, exact strikethrough timing) — those are local to writing-plans and not gating this spec.

## 14. References
- `docs/design-handoff/mood_characters/Mood Characters.html` — animated mood blob handoff (source of truth for blobs).
- `docs/design-handoff/mood_characters/README.md` — handoff documentation.
- Three reference mockup screenshots provided by the user (yellow / green / lilac screens).
- `legacy/index.html` (after Phase 0) — original HYROX app, behavioural reference for Phase 3.
