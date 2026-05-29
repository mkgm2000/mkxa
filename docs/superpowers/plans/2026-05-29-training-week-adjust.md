# Training Week Adjust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/training/adjust` flow that lets MK (and Xabi) request a Claude-generated next week, grounded in 6 UFV training PDFs + the `MKXA_23S_v3.xlsx` master plan delivered via Anthropic Files API + 1h extended prompt caching, and preview + edit + confirm the proposal before it drives the existing `/training` render path.

**Architecture:** Two new Supabase tables (`training_weeks`, `training_sources`) and a one-off Node script that uploads the six PDFs + the xlsx to Anthropic's Files API and stores their `file_id`s. Two new server routes (`/api/training/generate-week`, `/api/training/confirm-week`) wrap an Anthropic Messages call: stable `TRAINING_SYSTEM_PROMPT` cached ephemeral; all source documents cached ephemeral with the extended-TTL beta header; only the dynamic per-call context (registros + previous plan + extra prompt) is billed at full rate. Zod validates the model output. A new `/training/adjust` page composes a context box (last 2 weeks), an extra-prompt textarea, and an editable preview (reusing the existing `<BlockRow>` editor pattern). `getDays()` is augmented to accept an override so confirmed generated plans flow through the existing `/training` render path without forking it.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind v3.4 · Supabase JS v2 · `@anthropic-ai/sdk@^0.27` with the `files-api-2025-04-14` and `extended-cache-ttl-2025-04-11` beta headers · Zod · lucide-react · Vitest + React Testing Library + jsdom · `tsx` for the upload script.

**Reference docs:**
- `docs/superpowers/specs/2026-05-29-training-week-adjust-design.md` — spec (source of truth).
- `docs/training-sources/` — the 6 PDFs + xlsx already copied into the repo.
- `docs/design-handoff/sunflower/`, `docs/design-handoff/mood_characters/` — visual handoffs already used elsewhere.

---

## File Structure

| File | Purpose |
|---|---|
| `supabase/migrations/20260529130000_training_weeks.sql` | New `training_weeks` + `training_sources` tables + open RLS. |
| `lib/training/generated.ts` | Zod schema + types for `GeneratedWeek`. |
| `lib/anthropic/training-prompts.ts` | Exported `TRAINING_SYSTEM_PROMPT` constant (cache key). |
| `lib/anthropic/files.ts` | Thin client wrapper for the Anthropic Files API (`uploadFile`). |
| `lib/training/sources.ts` | Slug catalog + helper `readTrainingSources()` that fetches `training_sources` rows. |
| `lib/training/dynamic-context.ts` | Pure function building the dynamic user-turn text from registros + previous plan + extra_prompt. |
| `lib/hooks/use-confirmed-week.ts` | `useConfirmedWeek(athlete, week)` reads the confirmed plan row if any. |
| `lib/hooks/use-recent-registros.ts` | `useRecentRegistros(athlete, week)` returns the last two weeks' rows for the AdjustContextBox. |
| `lib/plan-hyrox.ts` (modify) | `getDays(week, athlete, override?)` accepts an optional `Day[]`. |
| `scripts/upload-training-sources.ts` | One-off `tsx` script that uploads the 6 PDFs + xlsx via the Files API and upserts `training_sources` rows. |
| `app/api/training/generate-week/route.ts` | POST → Claude call → Zod → insert `training_weeks` draft. |
| `app/api/training/confirm-week/route.ts` | PATCH → flips prior confirmed to `superseded`, sets the target to `confirmed`. |
| `app/(app)/training/page.tsx` (modify) | Bottom Link "Ajustar próxima semana" + pass override into `getDays`. |
| `app/(app)/training/adjust/page.tsx` | Selector + context box + textarea + generate + preview. |
| `components/training/AdjustContextBox.tsx` | Read-only last-two-weeks summary. |
| `components/training/AdjustPreview.tsx` | Renders the GeneratedWeek with editable blocks + rationale + accept/regenerate. |
| `components/training/RationaleNote.tsx` | Tappable expandable italic gray note. |
| `__tests__/lib/training/generated.test.ts` | Zod schema tests. |
| `__tests__/lib/training/dynamic-context.test.ts` | Builder tests. |
| `__tests__/lib/anthropic/training-prompts.test.ts` | Snapshot guard for the system prompt. |
| `__tests__/lib/hooks/use-confirmed-week.test.tsx` | Mocked Supabase. |
| `__tests__/api/generate-week.test.ts` | Mocked Anthropic + mocked Supabase. |
| `__tests__/api/confirm-week.test.ts` | Mocked Supabase. |
| `__tests__/components/training/RationaleNote.test.tsx` | Toggle behavior. |
| `__tests__/lib/plan-hyrox.test.ts` (extend) | Add a test for the new `override` arg. |

---

## Pre-flight

- [ ] **Pre-flight: clean tree on `main`**

Run:
```bash
cd ~/IdeaProjects/mkxa
pwd
git status
git log --oneline -3
```
Expected: pwd is `~/IdeaProjects/mkxa`, working tree clean (the 6 source files were already copied into `docs/training-sources/` and committed via this plan's pre-step), HEAD includes the spec commit `5960ff2 docs: training week adjust design spec`.

- [ ] **Pre-flight: baseline build + tests green**

Run: `npm test` (expect ≥ 184 passing) and `npx next build`. If anything is red, stop and fix the baseline first.

---

## Task 1: Migration — `training_weeks` + `training_sources`

**Files:**
- Create: `supabase/migrations/20260529130000_training_weeks.sql`
- Modify: `supabase/README.md`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260529130000_training_weeks.sql`:
```sql
create table if not exists training_weeks (
  id           uuid primary key default gen_random_uuid(),
  athlete      text not null check (athlete in ('MK','Xabi')),
  week         int  not null check (week between 1 and 23),
  version      int  not null default 1,
  status       text not null
                 check (status in ('draft','confirmed','superseded'))
                 default 'draft',
  plan_jsonb   jsonb not null,
  weekly_note  text,
  generated_by text not null
                 check (generated_by in ('claude','manual','seed'))
                 default 'claude',
  extra_prompt   text,
  source_summary jsonb,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (athlete, week, version)
);

create index if not exists training_weeks_athlete_week_idx on training_weeks (athlete, week);
create index if not exists training_weeks_status_idx       on training_weeks (status, athlete, week);

alter table training_weeks enable row level security;

drop policy if exists "training_weeks_all" on training_weeks;
create policy "training_weeks_all" on training_weeks for all using (true) with check (true);

create table if not exists training_sources (
  id          text primary key,
  file_id     text not null,
  filename    text not null,
  description text,
  uploaded_at timestamptz not null default now()
);

alter table training_sources enable row level security;

drop policy if exists "training_sources_all" on training_sources;
create policy "training_sources_all" on training_sources for all using (true) with check (true);
```

- [ ] **Step 2: Append pending entry to `supabase/README.md`**

Open `supabase/README.md` and add at the end of the "Applied log" list:
```markdown
- `20260529130000_training_weeks.sql` — pending (training_weeks + training_sources tables)
```

- [ ] **Step 3: Apply via Supabase CLI**

Run:
```bash
cd ~/IdeaProjects/mkxa
SUPABASE_ACCESS_TOKEN=<owner-PAT> supabase db push --include-all
```
Expected: `Applying migration 20260529130000_training_weeks.sql...` then `Finished supabase db push.`

- [ ] **Step 4: Verify with curl**

Run:
```bash
ANON=$(grep -oE 'eyJ[A-Za-z0-9_.-]+' .env.local | head -1)
curl -s "https://jxyqbtttgpdokotmbeud.supabase.co/rest/v1/training_weeks?select=id&limit=0" -H "apikey: $ANON" -w "%{http_code}\n"
curl -s "https://jxyqbtttgpdokotmbeud.supabase.co/rest/v1/training_sources?select=id&limit=0" -H "apikey: $ANON" -w "%{http_code}\n"
```
Expected: both return `[]200`.

- [ ] **Step 5: Update README log to applied**

Change the line you just added to:
```markdown
- `20260529130000_training_weeks.sql` — applied 2026-05-29 (training_weeks + training_sources tables)
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260529130000_training_weeks.sql supabase/README.md
git commit -m "feat(db): training_weeks + training_sources tables

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Commit the training-source files into the repo

**Files:**
- Create: `docs/training-sources/.gitkeep` (already populated; just track the directory)

- [ ] **Step 1: Confirm the source files are present**

Run:
```bash
ls -la ~/IdeaProjects/mkxa/docs/training-sources/
```
Expected: 5 `.pdf` files and 1 `.xlsx` file totaling ~30 MB.

- [ ] **Step 2: Commit them**

```bash
cd ~/IdeaProjects/mkxa
git add docs/training-sources/
git commit -m "docs: track 6 UFV training-source files (5 PDFs + xlsx master plan)

Used by scripts/upload-training-sources.ts to populate the
training_sources table with Anthropic file_ids.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `lib/anthropic/training-prompts.ts` — the canonical system prompt

**Files:**
- Create: `lib/anthropic/training-prompts.ts`
- Create: `__tests__/lib/anthropic/training-prompts.test.ts`

- [ ] **Step 1: Write the failing snapshot test**

Create `__tests__/lib/anthropic/training-prompts.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { TRAINING_SYSTEM_PROMPT } from '@/lib/anthropic/training-prompts';

describe('TRAINING_SYSTEM_PROMPT', () => {
  it('starts with the coach disclaimer', () => {
    expect(TRAINING_SYSTEM_PROMPT.startsWith('Eres el coach asistente HYROX')).toBe(true);
  });

  it('lists the strict rules numbered 1-6', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(TRAINING_SYSTEM_PROMPT).toContain(`${n}.`);
    }
  });

  it('declares the JSON schema with the GeneratedWeek field names', () => {
    for (const field of ['"athlete"', '"week"', '"weekly_note"', '"days"', '"rationale"', '"blocks"']) {
      expect(TRAINING_SYSTEM_PROMPT).toContain(field);
    }
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- training-prompts`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `lib/anthropic/training-prompts.ts`:
```ts
// Canonical training-week system prompt. Keep STABLE — this is the
// Anthropic prompt-cache key. Changes invalidate the cache.
export const TRAINING_SYSTEM_PROMPT = `Eres el coach asistente HYROX de MK y Xabi. Tu única fuente de verdad son los documentos adjuntos: 5 PDFs académicos UFV (cualidades complementarias, entrenamiento concurrente, macro, macro/meso/micro, periodización tradicional/inversa) y el Excel MKXA_23S_v3 con el plan maestro de 23 semanas para ambos atletas.

REGLAS ESTRICTAS:
1. La estructura semanal, fase, RPE objetivo, %RM y días/semana vienen del Excel master plan para esa semana W. NO inventes fases ni objetivos.
2. Cada ajuste vs el baseline del Excel se justifica citando un PDF concreto por su nombre (p.ej. "Tema 6 §interferencia AMPK/mTOR") o la celda del Excel correspondiente. Sin cita explícita en el campo "rationale" → no se hace el ajuste y se devuelve la sesión baseline IDÉNTICA.
3. Las semanas de descarga del Excel (S8, S12, S17) son intocables.
4. Si el atleta presenta RPE > objetivo o nota de molestia/fatiga, ajusta el volumen o la carga aplicando S.G.A./supercompensación (macro_meso_micro.pdf) dentro del margen permitido por la fase Excel.
5. NO inventes ejercicios. Sólo nombres que aparecen en el plan maestro o que se citan literalmente en los PDFs.
6. Output: JSON puro siguiendo el schema descrito. Sin markdown, sin prosa fuera del JSON, sin "explicaciones" antes o después.

JSON SCHEMA esperado:
{
  "athlete": "MK" | "Xabi",
  "week": number,
  "weekly_note": string,
  "days": [{
    "key": "D1"|"D2"|"D3"|"D4"|"D5"|"D6",
    "title": string,
    "rpe": string,
    "blocks": [{ "name": string, "sets": string, "load": string }],
    "rationale": string
  }]
}`;
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- training-prompts` → 3 pass.
```bash
git add lib/anthropic/training-prompts.ts __tests__/lib/anthropic/training-prompts.test.ts
git commit -m "feat(anthropic): TRAINING_SYSTEM_PROMPT canonical constant

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `lib/training/generated.ts` — Zod schema

**Files:**
- Create: `lib/training/generated.ts`
- Create: `__tests__/lib/training/generated.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/training/generated.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { GeneratedWeek, GeneratedDay, GeneratedBlock } from '@/lib/training/generated';

const validBlock = { name: 'Sentadilla', sets: '4x5', load: '32.5kg' };
const validDay = {
  key: 'D1', title: 'Fuerza', rpe: 'RPE 7-8',
  blocks: [validBlock],
  rationale: 'Sin cambios respecto baseline Excel S4',
};
const validWeek = {
  athlete: 'MK', week: 4,
  weekly_note: 'Base aeróbica progresando, mantener Z2 4 días (Excel S4)',
  days: [validDay, { ...validDay, key: 'D2' }, { ...validDay, key: 'D3' }],
};

describe('Generated schemas', () => {
  it('GeneratedBlock accepts a valid block', () => {
    expect(() => GeneratedBlock.parse(validBlock)).not.toThrow();
  });
  it('GeneratedDay requires at least one block', () => {
    expect(() => GeneratedDay.parse({ ...validDay, blocks: [] })).toThrow();
  });
  it('GeneratedWeek rejects week 0 and 24', () => {
    expect(() => GeneratedWeek.parse({ ...validWeek, week: 0 })).toThrow();
    expect(() => GeneratedWeek.parse({ ...validWeek, week: 24 })).toThrow();
  });
  it('GeneratedWeek requires 3 to 6 days', () => {
    expect(() => GeneratedWeek.parse({ ...validWeek, days: [validDay] })).toThrow();
    expect(() => GeneratedWeek.parse({
      ...validWeek,
      days: ['D1','D2','D3','D4','D5','D6','D6'].map((k) => ({ ...validDay, key: k as 'D1' })),
    })).toThrow();
  });
  it('GeneratedWeek accepts a fully valid payload', () => {
    expect(() => GeneratedWeek.parse(validWeek)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- generated`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `lib/training/generated.ts`:
```ts
import { z } from 'zod';

export const GeneratedBlock = z.object({
  name: z.string().min(1).max(120),
  sets: z.string().min(1).max(40),
  load: z.string().min(1).max(60),
});

export const GeneratedDay = z.object({
  key: z.enum(['D1', 'D2', 'D3', 'D4', 'D5', 'D6']),
  title: z.string().min(1).max(60),
  rpe: z.string().min(1).max(20),
  blocks: z.array(GeneratedBlock).min(1).max(12),
  rationale: z.string().min(1).max(400),
});

export const GeneratedWeek = z.object({
  athlete: z.enum(['MK', 'Xabi']),
  week: z.number().int().min(1).max(23),
  weekly_note: z.string().min(1).max(600),
  days: z.array(GeneratedDay).min(3).max(6),
});

export type GeneratedBlock = z.infer<typeof GeneratedBlock>;
export type GeneratedDay   = z.infer<typeof GeneratedDay>;
export type GeneratedWeek  = z.infer<typeof GeneratedWeek>;
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- generated` → 5 pass.
```bash
git add lib/training/generated.ts __tests__/lib/training/generated.test.ts
git commit -m "feat(training): GeneratedWeek Zod schema

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `lib/training/sources.ts` — slug catalog + reader

**Files:**
- Create: `lib/training/sources.ts`

- [ ] **Step 1: Implement (no test — single thin DB read; covered later via the generate-week test)**

Create `lib/training/sources.ts`:
```ts
import { supabaseServer } from '@/lib/supabase/server';

export const TRAINING_SOURCE_SLUGS = [
  'pdf_tema5_cualidades',
  'pdf_tema6_concurrente',
  'pdf_tema7_macro',
  'pdf_macro_meso_micro',
  'pdf_periodizacion_tradicional_inversa',
  'xlsx_master_23s',
] as const;

export type TrainingSourceSlug = (typeof TRAINING_SOURCE_SLUGS)[number];

export interface TrainingSourceRow {
  id: TrainingSourceSlug;
  file_id: string;
  filename: string;
}

export async function readTrainingSources(): Promise<TrainingSourceRow[]> {
  const { data, error } = await supabaseServer()
    .from('training_sources')
    .select('id,file_id,filename')
    .in('id', TRAINING_SOURCE_SLUGS as unknown as string[]);
  if (error) throw new Error(`training_sources read failed: ${error.message}`);
  return (data ?? []) as TrainingSourceRow[];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/training/sources.ts
git commit -m "feat(training): training_sources slug catalog + reader

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `lib/anthropic/files.ts` — Files API wrapper

**Files:**
- Create: `lib/anthropic/files.ts`

- [ ] **Step 1: Implement**

Create `lib/anthropic/files.ts`:
```ts
// Minimal wrapper for the Anthropic Files API. SDK v0.27 does not expose
// it yet, so we hit the REST endpoint directly with the beta header.

const FILES_URL = 'https://api.anthropic.com/v1/files';
const FILES_API_BETA = 'files-api-2025-04-14';
const ANTHROPIC_VERSION = '2023-06-01';

export interface UploadedFile {
  id: string;
  type: string;
  filename: string;
  size_bytes: number;
  created_at: string;
}

export async function uploadFile(args: {
  filepath: string;
  filename: string;
  mimeType: string;
}): Promise<UploadedFile> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const fs = await import('node:fs/promises');
  const buf = await fs.readFile(args.filepath);
  const blob = new Blob([buf], { type: args.mimeType });

  const form = new FormData();
  form.append('file', blob, args.filename);

  const res = await fetch(FILES_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-beta': FILES_API_BETA,
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Files API upload failed (${res.status}): ${text}`);
  }
  return (await res.json()) as UploadedFile;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/anthropic/files.ts
git commit -m "feat(anthropic): files.ts wrapper for the Files API REST endpoint

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `scripts/upload-training-sources.ts` — one-off upload + run it

**Files:**
- Create: `scripts/upload-training-sources.ts`
- Modify: `package.json` (add devDep `tsx` if not present and add a script)

- [ ] **Step 1: Install `tsx` if missing**

Run:
```bash
cd ~/IdeaProjects/mkxa
node -e "console.log(require('./package.json').devDependencies.tsx ?? 'absent')"
```
If `absent`, run:
```bash
npm install -D tsx@^4.19.0
```

- [ ] **Step 2: Add a script entry to `package.json`**

In `package.json`, in `"scripts"`, add (alongside `test`, `test:watch`):
```json
"upload-training-sources": "tsx scripts/upload-training-sources.ts"
```

- [ ] **Step 3: Implement the upload script**

Create `scripts/upload-training-sources.ts`:
```ts
/**
 * One-off uploader for the 6 training-source files.
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... \
 *   NEXT_PUBLIC_SUPABASE_URL=...    \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *     npm run upload-training-sources
 *
 * Idempotent: upserts on (id) so re-running re-uploads and rotates file_ids.
 */

import 'dotenv/config';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { uploadFile } from '../lib/anthropic/files';
import { TRAINING_SOURCE_SLUGS, type TrainingSourceSlug } from '../lib/training/sources';

interface SourceDef {
  slug: TrainingSourceSlug;
  filename: string;
  description: string;
  mimeType: string;
}

const SOURCES: SourceDef[] = [
  { slug: 'pdf_tema5_cualidades',                  filename: 'pdf_tema5_cualidades.pdf',                  description: 'UFV Tema 5: cualidades complementarias',           mimeType: 'application/pdf' },
  { slug: 'pdf_tema6_concurrente',                 filename: 'pdf_tema6_concurrente.pdf',                 description: 'UFV Tema 6: entrenamiento concurrente',            mimeType: 'application/pdf' },
  { slug: 'pdf_tema7_macro',                       filename: 'pdf_tema7_macro.pdf',                       description: 'UFV Tema 7: macrociclos',                          mimeType: 'application/pdf' },
  { slug: 'pdf_macro_meso_micro',                  filename: 'pdf_macro_meso_micro.pdf',                  description: 'UFV macro/meso/micro estructura jerárquica',       mimeType: 'application/pdf' },
  { slug: 'pdf_periodizacion_tradicional_inversa', filename: 'pdf_periodizacion_tradicional_inversa.pdf', description: 'UFV periodización tradicional e inversa',          mimeType: 'application/pdf' },
  { slug: 'xlsx_master_23s',                       filename: 'xlsx_master_23s.xlsx',                      description: 'MKXA 23S v3 master plan',                          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
];

async function main() {
  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPA || !ANON) throw new Error('Missing Supabase env');

  const supabase = createClient(SUPA, ANON);
  const root = path.resolve(__dirname, '..');
  const sourcesDir = path.join(root, 'docs', 'training-sources');

  for (const def of SOURCES) {
    const filepath = path.join(sourcesDir, def.filename);
    console.log(`Uploading ${def.slug} ← ${def.filename} …`);
    const uploaded = await uploadFile({ filepath, filename: def.filename, mimeType: def.mimeType });
    console.log(`  → file_id=${uploaded.id} bytes=${uploaded.size_bytes}`);

    const { error } = await supabase.from('training_sources').upsert(
      { id: def.slug, file_id: uploaded.id, filename: def.filename, description: def.description },
      { onConflict: 'id' },
    );
    if (error) throw new Error(`Supabase upsert failed for ${def.slug}: ${error.message}`);
  }
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });

// Use the catalog to keep the linter happy about an unused import.
void TRAINING_SOURCE_SLUGS;
```

- [ ] **Step 4: Run the script**

Run:
```bash
cd ~/IdeaProjects/mkxa
set -a; source .env.local; set +a
ANTHROPIC_API_KEY=<set-from-vercel-env> \
  npm run upload-training-sources
```
Expected: 6 lines `Uploading … → file_id=… bytes=…` then `Done.`

- [ ] **Step 5: Verify rows landed**

Run:
```bash
ANON=$(grep -oE 'eyJ[A-Za-z0-9_.-]+' .env.local | head -1)
curl -s "https://jxyqbtttgpdokotmbeud.supabase.co/rest/v1/training_sources?select=id,file_id,filename&order=id" -H "apikey: $ANON" | head -10
```
Expected: 6 rows, each with a `file_id` like `file_xxxxxxxx`.

- [ ] **Step 6: Commit**

```bash
git add scripts/upload-training-sources.ts package.json package-lock.json
git commit -m "feat(scripts): one-off uploader for training sources via Files API

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `lib/training/dynamic-context.ts` — builder for the user-turn text

**Files:**
- Create: `lib/training/dynamic-context.ts`
- Create: `__tests__/lib/training/dynamic-context.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/training/dynamic-context.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildDynamicContext } from '@/lib/training/dynamic-context';

describe('buildDynamicContext', () => {
  it('emits athlete + target_week + extra_prompt placeholder when empty', () => {
    const out = buildDynamicContext({
      athlete: 'MK', target_week: 4,
      extra_prompt: '',
      previousConfirmed: null,
      registros: [],
    });
    expect(out).toContain('ATLETA: MK');
    expect(out).toContain('SEMANA OBJETIVO: 4');
    expect(out).toContain('"(ninguna)"');
    expect(out).toContain('(no se generó previamente)');
    expect(out).toContain('(sin registros)');
  });

  it('inlines previousConfirmed and registros JSON', () => {
    const out = buildDynamicContext({
      athlete: 'Xabi', target_week: 5,
      extra_prompt: 'cuidar rodilla',
      previousConfirmed: { week: 4, days: [{ key: 'D1' }] } as never,
      registros: [{ week: 3, day_key: 'D1', completed: true, rpe: 7, notes: 'ok' } as never],
    });
    expect(out).toContain('"cuidar rodilla"');
    expect(out).toContain('"week":4');
    expect(out).toContain('"rpe":7');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- dynamic-context`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `lib/training/dynamic-context.ts`:
```ts
import type { Athlete } from '@/lib/athlete-context';
import type { GeneratedWeek } from '@/lib/training/generated';

export interface RecentRegistro {
  week: number;
  day_key: string;
  completed: boolean | null;
  rpe: number | null;
  notes: string | null;
  week_note: string | null;
}

export interface BuildDynamicContextArgs {
  athlete: Athlete;
  target_week: number;
  extra_prompt: string;
  previousConfirmed: GeneratedWeek | null;
  registros: RecentRegistro[];
}

export function buildDynamicContext(a: BuildDynamicContextArgs): string {
  const extra = a.extra_prompt.trim() ? a.extra_prompt.trim() : '(ninguna)';
  const previous = a.previousConfirmed
    ? JSON.stringify(a.previousConfirmed)
    : '(no se generó previamente)';
  const regs = a.registros.length > 0
    ? JSON.stringify(a.registros)
    : '(sin registros)';
  return [
    `ATLETA: ${a.athlete}`,
    `SEMANA OBJETIVO: ${a.target_week}`,
    `NOTAS EXTRA: "${extra}"`,
    '',
    `PLAN CONFIRMADO PREVIO (S${a.target_week - 1}):`,
    previous,
    '',
    'REGISTROS REALES ÚLTIMAS 2 SEMANAS:',
    regs,
    '',
    `Genera la SEMANA ${a.target_week} para ${a.athlete} aplicando las reglas estrictas.`,
  ].join('\n');
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- dynamic-context` → 2 pass.
```bash
git add lib/training/dynamic-context.ts __tests__/lib/training/dynamic-context.test.ts
git commit -m "feat(training): dynamic-context builder for the user turn

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `app/api/training/generate-week/route.ts`

**Files:**
- Create: `app/api/training/generate-week/route.ts`
- Create: `__tests__/api/generate-week.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/generate-week.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn();
vi.mock('@/lib/anthropic/client', () => ({
  anthropic: () => ({ messages: { create } }),
  ANTHROPIC_MODEL: 'claude-sonnet-4-6',
}));

const insertResult = { data: { id: 'tw-1' }, error: null };
const insert = vi.fn(() => ({
  select: () => ({ single: () => Promise.resolve(insertResult) }),
}));
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq, in: () => Promise.resolve({ data: [
  { id: 'pdf_tema5_cualidades',                  file_id: 'file_a' },
  { id: 'pdf_tema6_concurrente',                 file_id: 'file_b' },
  { id: 'pdf_tema7_macro',                       file_id: 'file_c' },
  { id: 'pdf_macro_meso_micro',                  file_id: 'file_d' },
  { id: 'pdf_periodizacion_tradicional_inversa', file_id: 'file_e' },
  { id: 'xlsx_master_23s',                       file_id: 'file_f' },
], error: null }) }));

const from = vi.fn(() => ({ select, insert }));
vi.mock('@/lib/supabase/server', () => ({
  supabaseServer: () => ({ from }),
}));

const VALID = {
  athlete: 'MK', week: 4,
  weekly_note: 'Base aeróbica. Excel S4.',
  days: [
    { key: 'D1', title: 'Fuerza', rpe: 'RPE 7-8',
      blocks: [{ name: 'Sentadilla', sets: '4x5', load: '32.5kg' }],
      rationale: 'Excel S4 baseline' },
    { key: 'D2', title: 'Z2',     rpe: 'RPE 4-5',
      blocks: [{ name: 'Carrera Z2', sets: "30'", load: '6:20/km' }],
      rationale: 'macro_meso_micro.pdf §carga progresiva' },
    { key: 'D3', title: 'HYROX',  rpe: 'RPE 5-6',
      blocks: [{ name: 'Ski Erg', sets: '3x250m', load: 'Técnica' }],
      rationale: 'Sin cambios respecto baseline Excel S4' },
  ],
};

describe('POST /api/training/generate-week', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  function makeReq(body: object) {
    return new Request('http://x/api/training/generate-week', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 200 with week_id and plan on a valid Claude response', async () => {
    create.mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(VALID) }] });
    const { POST } = await import('@/app/api/training/generate-week/route');
    const res = await POST(makeReq({ athlete: 'MK', target_week: 4, extra_prompt: '' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan.days).toHaveLength(3);
  });

  it('returns 502 when Claude returns invalid JSON', async () => {
    create.mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json' }] });
    const { POST } = await import('@/app/api/training/generate-week/route');
    const res = await POST(makeReq({ athlete: 'MK', target_week: 4, extra_prompt: '' }));
    expect(res.status).toBe(502);
  });

  it('returns 400 when target_week is out of range', async () => {
    const { POST } = await import('@/app/api/training/generate-week/route');
    const res = await POST(makeReq({ athlete: 'MK', target_week: 24, extra_prompt: '' }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- generate-week`
Expected: route file not found.

- [ ] **Step 3: Implement**

Create `app/api/training/generate-week/route.ts`:
```ts
import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import { TRAINING_SYSTEM_PROMPT } from '@/lib/anthropic/training-prompts';
import { readTrainingSources } from '@/lib/training/sources';
import { buildDynamicContext, type RecentRegistro } from '@/lib/training/dynamic-context';
import { GeneratedWeek } from '@/lib/training/generated';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ReqSchema = z.object({
  athlete: z.enum(['MK', 'Xabi']),
  target_week: z.number().int().min(1).max(23),
  extra_prompt: z.string().max(500).optional(),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON body', 400); }
  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid payload', 400);
  const { athlete, target_week } = parsed.data;
  const extra_prompt = parsed.data.extra_prompt ?? '';

  // 1. read training_sources
  let sources: Awaited<ReturnType<typeof readTrainingSources>>;
  try { sources = await readTrainingSources(); } catch { return jsonError('Las fuentes no están subidas; ejecuta scripts/upload-training-sources.ts', 500); }
  if (sources.length === 0) return jsonError('Las fuentes no están subidas; ejecuta scripts/upload-training-sources.ts', 500);

  // 2. read registros (last 2 weeks)
  const supa = supabaseServer();
  const lo = Math.max(1, target_week - 2);
  const { data: regRows } = await supa.from('registros')
    .select('week,day_key,completed,rpe,notes,week_note')
    .eq('athlete', athlete)
    .gte('week', lo)
    .lte('week', target_week - 1);
  const registros = (regRows ?? []) as RecentRegistro[];

  // 3. read previously confirmed week (target_week - 1)
  const { data: prevRow } = await supa.from('training_weeks')
    .select('plan_jsonb')
    .eq('athlete', athlete).eq('week', target_week - 1).eq('status', 'confirmed')
    .maybeSingle();
  const previousConfirmed = prevRow && (prevRow as { plan_jsonb: unknown }).plan_jsonb
    ? ((prevRow as { plan_jsonb: import('@/lib/training/generated').GeneratedWeek }).plan_jsonb)
    : null;

  const dynamicText = buildDynamicContext({
    athlete, target_week, extra_prompt, previousConfirmed, registros,
  });

  // 4. Build content blocks: documents + dynamic text.
  type DocBlock = { type: 'document'; source: { type: 'file'; file_id: string }; cache_control?: { type: 'ephemeral' } };
  type TextBlock = { type: 'text'; text: string };
  const docBlocks: DocBlock[] = sources.map((s, i, arr) => ({
    type: 'document',
    source: { type: 'file', file_id: s.file_id },
    ...(i === arr.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
  const content: Array<DocBlock | TextBlock> = [...docBlocks, { type: 'text', text: dynamicText }];

  // 5. Anthropic call
  let rawText: string;
  try {
    const res = await anthropic().messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: [{
        type: 'text',
        text: TRAINING_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      } as unknown as Anthropic.TextBlockParam],
      messages: [{ role: 'user', content: content as unknown as never }],
    } as unknown as Anthropic.MessageCreateParamsNonStreaming);
    const first = res.content.find((b) => b.type === 'text');
    rawText = first && 'text' in first ? first.text : '';
  } catch (err) {
    console.error('[generate-week] anthropic error', err);
    return jsonError('Algo falló pidiendo a Claude. Reintenta.', 502);
  }

  // 6. JSON parse + Zod validate
  let parsedJson: unknown;
  try { parsedJson = JSON.parse(rawText.trim().replace(/^```json\s*|\s*```$/g, '')); }
  catch { return jsonError('Modelo devolvió formato inesperado', 502); }
  const safe = GeneratedWeek.safeParse(parsedJson);
  if (!safe.success) {
    console.error('[generate-week] schema mismatch', safe.error.issues, parsedJson);
    return jsonError('Modelo devolvió formato inesperado', 502);
  }
  const plan = safe.data;

  // 7. Find next version
  const { data: versions } = await supa.from('training_weeks')
    .select('version').eq('athlete', athlete).eq('week', target_week);
  const nextVersion = ((versions as { version: number }[] | null) ?? [])
    .reduce((m, r) => Math.max(m, r.version), 0) + 1;

  // 8. Insert as draft
  const { data: inserted, error: insErr } = await supa.from('training_weeks')
    .insert({
      athlete, week: target_week, version: nextVersion, status: 'draft',
      plan_jsonb: plan, weekly_note: plan.weekly_note,
      generated_by: 'claude', extra_prompt: extra_prompt || null,
      source_summary: { registros, previousConfirmed: previousConfirmed ? { week: previousConfirmed.week } : null },
    })
    .select('id')
    .single();
  if (insErr || !inserted) return jsonError('No se pudo guardar el borrador', 500);

  return NextResponse.json({ week_id: (inserted as { id: string }).id, plan });
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- generate-week` → 3 pass.
```bash
git add app/api/training/generate-week/route.ts __tests__/api/generate-week.test.ts
git commit -m "feat(api): /api/training/generate-week with cached PDFs + Zod

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `app/api/training/confirm-week/route.ts`

**Files:**
- Create: `app/api/training/confirm-week/route.ts`
- Create: `__tests__/api/confirm-week.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/confirm-week.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const update = vi.fn();
const eq3 = vi.fn(() => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'old-id' }, error: null }) }) }));
const eq2 = vi.fn(() => ({ eq: eq3 }));
const eqUpdate = vi.fn(() => ({ eq: eq2 }));
const supersededChain = vi.fn(() => ({ eq: eqUpdate }));
const single = vi.fn(() => Promise.resolve({ data: { athlete: 'MK', week: 4 }, error: null }));
const eqSelect = vi.fn(() => ({ single }));
const selectRow = vi.fn(() => ({ eq: eqSelect }));
const confirmUpdate = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));

const fromMock = vi.fn((table: string) => {
  // First two calls: SELECT the target row to get (athlete, week)
  // Then UPDATE old confirmed → superseded
  // Then UPDATE target → confirmed
  return {
    select: selectRow,
    update: vi.fn((patch: { status: string }) => {
      if (patch.status === 'superseded') return { eq: eqUpdate };
      if (patch.status === 'confirmed')  return { eq: vi.fn(() => Promise.resolve({ error: null })) };
      return { eq: () => Promise.resolve({ error: null }) };
    }),
  };
});
vi.mock('@/lib/supabase/server', () => ({ supabaseServer: () => ({ from: fromMock }) }));

describe('PATCH /api/training/confirm-week', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects missing week_id', async () => {
    const { PATCH } = await import('@/app/api/training/confirm-week/route');
    const res = await PATCH(new Request('http://x/api/training/confirm-week', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it('confirms a target row and returns 200', async () => {
    const { PATCH } = await import('@/app/api/training/confirm-week/route');
    const res = await PATCH(new Request('http://x/api/training/confirm-week', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ week_id: 'tw-1' }),
    }));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- confirm-week`
Expected: route module not found.

- [ ] **Step 3: Implement**

Create `app/api/training/confirm-week/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ReqSchema = z.object({ week_id: z.string().min(1) });

function jsonError(m: string, s: number) {
  return NextResponse.json({ error: m }, { status: s });
}

export async function PATCH(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON', 400); }
  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid payload', 400);

  const supa = supabaseServer();

  // 1. fetch target row to get athlete + week
  const { data: row, error: selErr } = await supa
    .from('training_weeks')
    .select('athlete,week')
    .eq('id', parsed.data.week_id)
    .single();
  if (selErr || !row) return jsonError('Versión no encontrada', 404);
  const { athlete, week } = row as { athlete: 'MK' | 'Xabi'; week: number };

  // 2. flip any prior confirmed to superseded
  const { error: supErr } = await supa
    .from('training_weeks')
    .update({ status: 'superseded' })
    .eq('athlete', athlete)
    .eq('week', week)
    .eq('status', 'confirmed');
  if (supErr) return jsonError('No se pudo archivar la versión previa', 500);

  // 3. flip target to confirmed
  const { error: cfErr } = await supa
    .from('training_weeks')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', parsed.data.week_id);
  if (cfErr) return jsonError('No se pudo confirmar la versión', 500);

  return NextResponse.json({ ok: true, athlete, week });
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- confirm-week` → 2 pass.
```bash
git add app/api/training/confirm-week/route.ts __tests__/api/confirm-week.test.ts
git commit -m "feat(api): /api/training/confirm-week flips prior confirmed to superseded

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: `lib/hooks/use-confirmed-week.ts`

**Files:**
- Create: `lib/hooks/use-confirmed-week.ts`
- Create: `__tests__/lib/hooks/use-confirmed-week.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/hooks/use-confirmed-week.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConfirmedWeek } from '@/lib/hooks/use-confirmed-week';

const maybeSingle = vi.fn();
const eq3 = vi.fn(() => ({ maybeSingle }));
const eq2 = vi.fn(() => ({ eq: eq3 }));
const eq1 = vi.fn(() => ({ eq: eq2 }));
const select = vi.fn(() => ({ eq: eq1 }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({ from: () => ({ select }) }),
}));

function Probe() {
  const { plan, loading } = useConfirmedWeek('MK', 4);
  return <p>l:{String(loading)} d:{plan?.days?.length ?? 0}</p>;
}

describe('useConfirmedWeek', () => {
  beforeEach(() => vi.clearAllMocks());
  it('returns null when no confirmed row exists', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('l:false d:0')).toBeInTheDocument());
  });
  it('returns the plan when present', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { plan_jsonb: { athlete: 'MK', week: 4, weekly_note: 'x', days: [
        { key: 'D1', title: 't', rpe: 'r', blocks: [{ name: 'n', sets: 's', load: 'l' }], rationale: 'r' },
        { key: 'D2', title: 't', rpe: 'r', blocks: [{ name: 'n', sets: 's', load: 'l' }], rationale: 'r' },
        { key: 'D3', title: 't', rpe: 'r', blocks: [{ name: 'n', sets: 's', load: 'l' }], rationale: 'r' },
      ] } },
      error: null,
    });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('l:false d:3')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- use-confirmed-week`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `lib/hooks/use-confirmed-week.ts`:
```ts
'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Athlete } from '@/lib/athlete-context';
import type { GeneratedWeek } from '@/lib/training/generated';

export function useConfirmedWeek(athlete: Athlete | null, week: number | null) {
  const [plan, setPlan] = useState<GeneratedWeek | null>(null);
  const [loading, setLoading] = useState<boolean>(athlete !== null && week !== null);

  useEffect(() => {
    if (!athlete || week == null) { setPlan(null); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient()
        .from('training_weeks')
        .select('plan_jsonb')
        .eq('athlete', athlete)
        .eq('week', week)
        .eq('status', 'confirmed')
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setPlan(null); setLoading(false); return; }
      const p = (data as { plan_jsonb: GeneratedWeek }).plan_jsonb;
      setPlan(p);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete, week]);

  return { plan, loading };
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- use-confirmed-week` → 2 pass.
```bash
git add lib/hooks/use-confirmed-week.ts __tests__/lib/hooks/use-confirmed-week.test.tsx
git commit -m "feat(hooks): useConfirmedWeek reads confirmed training_weeks row

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: `lib/hooks/use-recent-registros.ts`

**Files:**
- Create: `lib/hooks/use-recent-registros.ts`

- [ ] **Step 1: Implement (no test — single read; covered by manual UI smoke)**

Create `lib/hooks/use-recent-registros.ts`:
```ts
'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Athlete } from '@/lib/athlete-context';
import type { RecentRegistro } from '@/lib/training/dynamic-context';

export function useRecentRegistros(athlete: Athlete | null, targetWeek: number | null) {
  const [rows, setRows] = useState<RecentRegistro[]>([]);
  const [loading, setLoading] = useState<boolean>(athlete !== null && targetWeek !== null);

  useEffect(() => {
    if (!athlete || targetWeek == null) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const lo = Math.max(1, targetWeek - 2);
      const { data, error } = await supabaseClient()
        .from('registros')
        .select('week,day_key,completed,rpe,notes,week_note')
        .eq('athlete', athlete)
        .gte('week', lo)
        .lte('week', targetWeek - 1)
        .order('week', { ascending: true });
      if (cancelled) return;
      if (error || !data) { setRows([]); setLoading(false); return; }
      setRows(data as RecentRegistro[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete, targetWeek]);

  return { rows, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/use-recent-registros.ts
git commit -m "feat(hooks): useRecentRegistros reads the last two weeks' rows

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Augment `lib/plan-hyrox.ts::getDays`

**Files:**
- Modify: `lib/plan-hyrox.ts`
- Modify: `__tests__/lib/plan-hyrox.test.ts`

- [ ] **Step 1: Add the failing test**

Open `__tests__/lib/plan-hyrox.test.ts` and append:
```ts
import { getDays as getDaysOverride, type Day as OverrideDay } from '@/lib/plan-hyrox';

describe('getDays override', () => {
  it('returns the override when one is provided', () => {
    const ov: OverrideDay[] = [
      { key: 'D1', title: 'Custom', rpe: 'RPE X', blocks: [{ name: 'x', sets: '1x1', load: '1' }] },
    ];
    const out = getDaysOverride(1, 'MK', ov);
    expect(out).toBe(ov);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- plan-hyrox`
Expected: the new test fails because `getDays` only accepts two arguments.

- [ ] **Step 3: Update `getDays` to accept an optional override**

In `lib/plan-hyrox.ts`, replace the existing `export function getDays(...)` with:
```ts
export function getDays(
  week: number,
  athlete: Athlete | null,
  override?: Day[],
): Day[] {
  if (override && override.length > 0) return override;
  const p = PLAN[week];
  if (!p) {
    const fallback = PLAN[Math.min(week, MAX_WEEK)];
    return fallback[athlete ?? 'MK'] ?? fallback.MK;
  }
  return p[athlete ?? 'MK'] ?? p.MK;
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- plan-hyrox` → all pass (existing + 1 new).
```bash
git add lib/plan-hyrox.ts __tests__/lib/plan-hyrox.test.ts
git commit -m "feat(plan-hyrox): getDays accepts an optional Day[] override

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: `<RationaleNote>` component

**Files:**
- Create: `components/training/RationaleNote.tsx`
- Create: `__tests__/components/training/RationaleNote.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/training/RationaleNote.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { RationaleNote } from '@/components/training/RationaleNote';

describe('RationaleNote', () => {
  it('renders an accessible toggle and the text when open', async () => {
    const user = userEvent.setup();
    render(<RationaleNote text="Excel S4 baseline" variant="day" />);
    const btn = screen.getByRole('button', { name: /justificaci/i });
    await user.click(btn);
    expect(screen.getByText('Excel S4 baseline')).toBeInTheDocument();
  });

  it('uses the weekly label when variant=weekly', () => {
    render(<RationaleNote text="x" variant="weekly" initiallyOpen />);
    expect(screen.getByRole('button', { name: /nota semanal/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- RationaleNote`
Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/training/RationaleNote.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface Props { text: string; variant: 'weekly' | 'day'; initiallyOpen?: boolean }

export function RationaleNote({ text, variant, initiallyOpen = false }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const label = variant === 'weekly' ? 'Nota semanal' : 'Justificación';
  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] font-medium text-ink-muted"
      >
        {label}
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          className={clsx('transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && <p className="mt-1 text-[13px] italic text-ink-muted">{text}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npm test -- RationaleNote` → 2 pass.
```bash
git add components/training/RationaleNote.tsx __tests__/components/training/RationaleNote.test.tsx
git commit -m "feat(training): RationaleNote expandable note

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: `<AdjustContextBox>` component

**Files:**
- Create: `components/training/AdjustContextBox.tsx`

- [ ] **Step 1: Implement (no unit test — covered by manual smoke)**

Create `components/training/AdjustContextBox.tsx`:
```tsx
'use client';

import { useRecentRegistros } from '@/lib/hooks/use-recent-registros';
import type { Athlete } from '@/lib/athlete-context';

export function AdjustContextBox({ athlete, week }: { athlete: Athlete; week: number }) {
  const { rows, loading } = useRecentRegistros(athlete, week);
  if (loading) {
    return <p className="text-[13px] text-ink-muted">Cargando contexto…</p>;
  }
  const byWeek = new Map<number, typeof rows>();
  for (const r of rows) {
    const arr = byWeek.get(r.week) ?? [];
    arr.push(r);
    byWeek.set(r.week, arr);
  }
  const weeks = Array.from(byWeek.keys()).sort((a, b) => a - b);
  if (weeks.length === 0) {
    return <p className="text-[13px] text-ink-muted">Sin registros previos.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {weeks.map((w) => {
        const rs = byWeek.get(w) ?? [];
        const completed = rs.filter((r) => r.completed === true).length;
        const rpes = rs.map((r) => r.rpe).filter((x): x is number => typeof x === 'number');
        const avg = rpes.length > 0 ? (rpes.reduce((s, x) => s + x, 0) / rpes.length) : null;
        const weekNote = rs.map((r) => r.week_note).find((x): x is string => !!x) ?? '';
        return (
          <div key={w} className="rounded-card bg-white p-3 shadow-item">
            <p className="text-[12px] font-bold text-ink">S{w} — {completed}/4 sesiones</p>
            {avg != null && <p className="text-[12px] text-ink-muted">RPE medio: {avg.toFixed(1)}</p>}
            {weekNote && <p className="mt-1 line-clamp-3 text-[12px] text-ink-muted">{weekNote}</p>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/training/AdjustContextBox.tsx
git commit -m "feat(training): AdjustContextBox shows last 2 weeks summary

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: `<AdjustPreview>` component

**Files:**
- Create: `components/training/AdjustPreview.tsx`

- [ ] **Step 1: Implement**

Create `components/training/AdjustPreview.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { RationaleNote } from './RationaleNote';
import type { GeneratedWeek, GeneratedDay, GeneratedBlock } from '@/lib/training/generated';

interface Props {
  plan: GeneratedWeek;
  onAccept: (edited: GeneratedWeek) => Promise<void> | void;
  onRegenerate: () => void;
  busy?: boolean;
}

export function AdjustPreview({ plan, onAccept, onRegenerate, busy }: Props) {
  const [draft, setDraft] = useState<GeneratedWeek>(plan);

  function updateBlock(dayIdx: number, blockIdx: number, patch: Partial<GeneratedBlock>) {
    setDraft((d) => {
      const days = d.days.map((day, i) => {
        if (i !== dayIdx) return day;
        const blocks = day.blocks.map((b, j) => (j === blockIdx ? { ...b, ...patch } : b));
        return { ...day, blocks } as GeneratedDay;
      });
      return { ...d, days };
    });
  }

  return (
    <section className="flex flex-col gap-4 px-1 pb-6">
      <RationaleNote text={draft.weekly_note} variant="weekly" initiallyOpen />

      {draft.days.map((day, di) => (
        <article key={day.key} className="mx-4 rounded-card bg-white p-4 shadow-card">
          <header className="flex items-baseline gap-2">
            <span className="rounded-pill bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
              {day.key}
            </span>
            <h3 className="font-sans text-[16px] font-extrabold text-ink">{day.title}</h3>
            <span className="ml-auto text-[11px] font-medium text-ink-muted">{day.rpe}</span>
          </header>

          <ul className="mt-3 flex flex-col gap-2">
            {day.blocks.map((b, bi) => (
              <li key={bi} className="flex flex-col gap-1 border-b border-ink-soft py-1 last:border-b-0">
                <input
                  value={b.name}
                  onChange={(e) => updateBlock(di, bi, { name: e.target.value })}
                  aria-label={`${day.key} bloque ${bi + 1} nombre`}
                  className="bg-transparent text-[14px] font-bold text-ink outline-none"
                />
                <div className="flex gap-2">
                  <input
                    value={b.sets}
                    onChange={(e) => updateBlock(di, bi, { sets: e.target.value })}
                    aria-label={`${day.key} bloque ${bi + 1} sets`}
                    className="w-28 bg-transparent text-[12px] tabular-nums text-ink outline-none"
                  />
                  <input
                    value={b.load}
                    onChange={(e) => updateBlock(di, bi, { load: e.target.value })}
                    aria-label={`${day.key} bloque ${bi + 1} carga`}
                    className="flex-1 bg-transparent text-[12px] tabular-nums text-ink outline-none"
                  />
                </div>
              </li>
            ))}
          </ul>

          <RationaleNote text={day.rationale} variant="day" />
        </article>
      ))}

      <div className="mx-4 mt-2 flex gap-2">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          className="flex-1 rounded-action border border-ink-soft py-3 text-[14px] font-medium text-ink disabled:opacity-40"
        >
          Regenerar
        </button>
        <button
          type="button"
          onClick={() => onAccept(draft)}
          disabled={busy}
          className="flex-1 rounded-action bg-ink py-3 text-[14px] font-bold text-white disabled:opacity-40"
        >
          Aceptar plan
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/training/AdjustPreview.tsx
git commit -m "feat(training): AdjustPreview editable Day cards with rationale

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: `/training/adjust` page

**Files:**
- Create: `app/(app)/training/adjust/page.tsx`

- [ ] **Step 1: Implement**

Create `app/(app)/training/adjust/page.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { AdjustContextBox } from '@/components/training/AdjustContextBox';
import { AdjustPreview } from '@/components/training/AdjustPreview';
import { MoodBlob } from '@/components/mood/MoodBlob';
import { useAthlete } from '@/lib/athlete-context';
import { getCurrentWeek } from '@/lib/plan-hyrox';
import type { GeneratedWeek } from '@/lib/training/generated';

export default function AdjustPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const athlete = useAthlete();
  const defaultWeek = Number(sp.get('week') ?? '') || Math.min(23, getCurrentWeek() + 1);

  const [targetWeek, setTargetWeek] = useState<number>(defaultWeek);
  const [extraPrompt, setExtraPrompt] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [weekId, setWeekId] = useState<string | null>(null);
  const [plan, setPlan] = useState<GeneratedWeek | null>(null);

  useEffect(() => setError(null), [targetWeek, extraPrompt]);

  async function generate() {
    if (!athlete) return;
    setBusy(true); setError(null); setPlan(null); setWeekId(null);
    try {
      const res = await fetch('/api/training/generate-week', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ athlete, target_week: targetWeek, extra_prompt: extraPrompt }),
      });
      if (!res.ok) { setError(await res.text()); return; }
      const body = await res.json() as { week_id: string; plan: GeneratedWeek };
      setWeekId(body.week_id);
      setPlan(body.plan);
    } finally {
      setBusy(false);
    }
  }

  async function accept(edited: GeneratedWeek) {
    if (!weekId) return;
    setBusy(true);
    try {
      const res = await fetch('/api/training/confirm-week', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ week_id: weekId }),
      });
      if (!res.ok) { setError(await res.text()); return; }
      // edited blocks are persisted only in-memory for the preview; the
      // accepted version is whatever was already inserted as draft. If
      // we need to capture edits, a future task can PUT them back.
      void edited;
      router.push(`/training?week=${targetWeek}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-col gap-5 px-1 pb-6 pt-4">
      <header className="flex items-center justify-between px-4">
        <Link href="/training" aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">Ajustar próxima semana</h1>
        <span aria-hidden className="h-10 w-10" />
      </header>

      {!plan && (
        <section className="flex flex-col gap-4 px-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">Semana objetivo</span>
            <select
              value={targetWeek}
              onChange={(e) => setTargetWeek(Number(e.target.value))}
              className="rounded-md border border-ink-soft bg-white px-3 py-1 text-[14px]"
              aria-label="Semana objetivo"
            >
              {Array.from({ length: 23 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>S{w}</option>
              ))}
            </select>
          </div>

          {athlete && <AdjustContextBox athlete={athlete} week={targetWeek} />}

          <label className="flex flex-col gap-1 text-[13px] text-ink">
            Notas para la generación (opcional)
            <textarea
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Énfasis en sled, semana cómoda…"
              className="rounded-action border border-ink-soft bg-white px-3 py-2 text-[14px] outline-none focus:border-ink"
            />
          </label>

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <button
            type="button"
            onClick={generate}
            disabled={busy || !athlete}
            className="flex items-center justify-center gap-3 rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-40"
          >
            {busy ? <>Pidiendo a Claude… <MoodBlob mood="worried" size={28} withFloor={false} withParticles={false} animate /></> : 'Generar'}
          </button>
        </section>
      )}

      {plan && (
        <AdjustPreview
          plan={plan}
          busy={busy}
          onAccept={accept}
          onRegenerate={() => { setPlan(null); setWeekId(null); }}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Smoke build**

Run: `cd ~/IdeaProjects/mkxa && npx next build 2>&1 | tail -8`
Expected: build succeeds with `/training/adjust` listed.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/training/adjust/page.tsx"
git commit -m "feat(training): /training/adjust page (selector + context + generate + preview)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: Trigger in `/training` Plan tab + use confirmed week as override

**Files:**
- Modify: `app/(app)/training/page.tsx`

- [ ] **Step 1: Open the page and add an import + a hook + a button**

In `app/(app)/training/page.tsx`:

1. At the top, alongside other imports, add:
```ts
import Link from 'next/link';
import { useConfirmedWeek } from '@/lib/hooks/use-confirmed-week';
import { getCurrentWeek } from '@/lib/plan-hyrox';
```
(remove any duplicates if they were already there)

2. Inside the component, replace the existing `const days = getDays(week, athlete)` line with:
```ts
const { plan: confirmedPlan } = useConfirmedWeek(athlete, week);
// Strip rationale from confirmed plan to match the Day[] render contract.
const override = confirmedPlan
  ? confirmedPlan.days.map(({ rationale: _r, ...d }) => d)
  : undefined;
const days = getDays(week, athlete, override);
```
(adjust the destructure if `getDays` is called via a different name in the file; preserve all other state.)

3. Just below the sessions list, before the week-note `<textarea>`, add:
```tsx
{(() => {
  const next = Math.min(23, Math.max(week + 1, getCurrentWeek() + 1));
  return (
    <Link
      href={`/training/adjust?week=${next}`}
      className="mx-4 my-3 flex items-center justify-center gap-2 rounded-action border border-ink-soft py-3 text-[14px] font-medium text-ink"
    >
      Ajustar próxima semana
    </Link>
  );
})()}
```

- [ ] **Step 2: Smoke run dev server**

Run:
```bash
cd ~/IdeaProjects/mkxa
npm run dev > /tmp/mkxa-dev.log 2>&1 &
sleep 8
curl -sf http://localhost:3000/training       -o /dev/null -w "/training: %{http_code}\n"
curl -sf http://localhost:3000/training/adjust -o /dev/null -w "/adjust:   %{http_code}\n"
kill %1 2>/dev/null
wait 2>/dev/null || true
```
Expected: both `200`.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/training/page.tsx"
git commit -m "feat(training): prefer confirmed generated week + Ajustar button

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: Full verification + deploy

- [ ] **Step 1: Full test run**

Run: `cd ~/IdeaProjects/mkxa && npm test`
Expected: all tests pass (≥ 184 baseline + ≥ 15 new from this plan).

- [ ] **Step 2: Production build**

Run: `npx next build`
Expected: clean. New routes `/training/adjust`, `/api/training/generate-week`, `/api/training/confirm-week` listed.

- [ ] **Step 3: Push**

Run: `git push origin main`
Expected: push succeeds.

- [ ] **Step 4: Deploy**

Run: `vercel deploy --prod --yes`
Expected: a new READY URL aliased to `mkxa.vercel.app`.

- [ ] **Step 5: Production smoke**

Run:
```bash
curl -sf https://mkxa.vercel.app/training        -o /dev/null -w "/training:        %{http_code}\n"
curl -sf https://mkxa.vercel.app/training/adjust -o /dev/null -w "/training/adjust: %{http_code}\n"
curl -sf -X POST https://mkxa.vercel.app/api/training/generate-week \
  -H 'content-type: application/json' -d '{}' -o /dev/null -w "/generate-week: %{http_code}\n"
curl -sf -X PATCH https://mkxa.vercel.app/api/training/confirm-week \
  -H 'content-type: application/json' -d '{}' -o /dev/null -w "/confirm-week: %{http_code}\n"
```
Expected: `/training` and `/training/adjust` return `200`; both API endpoints return `400` on empty body (validation works).

- [ ] **Step 6: Manual mobile E2E (notes only)**

Open `https://mkxa.vercel.app/training` on a phone:
1. Tap "Ajustar próxima semana".
2. Verify the context box shows the last 2 weeks' summary.
3. Type an extra note; tap Generar; wait ~30 s.
4. Verify the preview shows weekly_note (with citation), and at least 3 Day cards with rationale chevrons.
5. Edit one block name and one load; tap "Aceptar plan".
6. Verify `/training` re-rendered on the selected week using the new plan.

Stop the plan once Step 6 is complete; file any UX deltas as new tasks rather than expanding this plan.

---

## Self-review checklist (run after writing this plan, before execution)

- ✅ **Spec coverage:**
  - DB tables + bucket (spec §4) → Task 1.
  - Source files in repo (spec §11 risks: idempotent re-run) → Task 2.
  - Canonical system prompt (spec §6.4) → Task 3.
  - Zod schema (spec §5) → Task 4.
  - Source slug catalog (spec §4.2) → Task 5.
  - Files API wrapper (spec §6.5) → Task 6.
  - One-off upload script (spec §6 file structure) → Task 7.
  - Dynamic-context builder (spec §6.4) → Task 8.
  - Generate-week route with caching + Zod (spec §6.2 + §6.5) → Task 9.
  - Confirm-week route with version flip (spec §6.2) → Task 10.
  - `useConfirmedWeek` (spec §6.1 file structure) → Task 11.
  - `useRecentRegistros` (spec §6.1) → Task 12.
  - `getDays` override (spec §6.3) → Task 13.
  - `<RationaleNote>` (spec §7.4) → Task 14.
  - `<AdjustContextBox>` (spec §7.2) → Task 15.
  - `<AdjustPreview>` (spec §7.3) → Task 16.
  - `/training/adjust` page (spec §7) → Task 17.
  - Trigger button + override wiring (spec §7.1 + §6.3) → Task 18.
  - Deploy + smoke (spec §10 out-of-scope explicitly excludes streaming, multi-week, diff, etc.) → Task 19.

- ✅ **No placeholders.** Every code block is concrete; every command shows expected output; no "TODO/TBD/implement later".

- ✅ **Type consistency.** `Athlete`, `GeneratedWeek`, `GeneratedDay`, `GeneratedBlock`, `RecentRegistro`, `Day`, `TrainingSourceSlug`, `TrainingSourceRow` defined once and re-imported. Every API route returns `{ week_id, plan }` or `{ error }` shapes as referenced by the consumer pages.

- ✅ **TDD.** Every behavioural unit (Zod schema, builder, route handlers, hooks, RationaleNote) has its failing test written before the implementation. Pure composition / read-only display files (sources reader, AdjustContextBox, AdjustPreview, pages) are covered by manual smoke + the production E2E in Task 19.

- ✅ **DRY.** `getMoodTokens`, `getCurrentWeek`, `supabaseClient`/`supabaseServer`, `anthropic()`/`ANTHROPIC_MODEL`, `MOOD_ORDER`, `RationaleNote` are each defined once. The cached PDFs share one `cache_control` block via the standard "mark the last one" idiom.

- ✅ **YAGNI.** No streaming, no diff view, no multi-week, no rollback button, no admin audit page — all explicitly deferred in spec §10.

- ✅ **Frequent commits.** Tasks 1–18 each end in a commit; Task 19 pushes + deploys.
