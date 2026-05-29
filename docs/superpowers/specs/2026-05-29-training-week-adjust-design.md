# Training Week Adjust Design Spec

**Date:** 2026-05-29
**Status:** Approved (brainstorming complete, pending writing-plans)
**Owner:** Xabi
**Stakeholders:** Xabi, MK
**Repo:** https://github.com/mkgm2000/mkxa

---

## 1. Context

MK currently runs an external workflow: she takes the weekly sensations and RPEs that the app already records, pastes them into Claude desktop with six university PDFs (UFV training theory) plus the `MKXA_23S_v3.xlsx` master plan, and asks Claude to rewrite the next training week. She then copies the result back into her Excel.

This spec brings that workflow into the app: MK opens a single screen, optionally adds extra notes, taps "Generar", and gets a draft of the next week back inside the app — derived from the same sources, with citations, that she can edit in place and confirm. The same flow works for Xabi as a separate athlete.

The training module already exists: `lib/plan-hyrox.ts` exposes a hard-coded `PLAN` const for weeks 1–3, the `registros` Supabase table stores per-day completion + RPE + notes + a weekly note, `SessionCard` renders day plans, and `RpeModal` captures RPE post-session. None of that changes structurally — generated weeks plug into the same render path.

## 2. Goals & non-goals

### Goals
- One-tap weekly adjustment grounded in the user's actual source materials (6 PDFs + xlsx master plan), with verifiable citations per session and per week.
- Strict anti-hallucination: when Claude cannot ground a change in the supplied documents, it must return the Excel baseline unchanged for that day.
- Preview-then-confirm flow: Claude proposes, MK reviews + tweaks blocks inline, MK confirms; the confirmed week then drives `/training` for that week.
- Independent per athlete (MK / Xabi).
- Cost-controlled via Anthropic Files API + prompt caching (1h extended).

### Non-goals
- Plan generation for the *current* week MK is mid-training (only next or future weeks).
- Automatic ingestion of new PDFs at runtime (upload is a one-time admin script).
- Auto-confirmation without user review.
- Cross-athlete reasoning (each call processes one athlete).
- Multi-week generation in a single call (one week at a time).

## 3. Decisions

| Topic | Decision | Why |
|---|---|---|
| Trigger | Permanent button "Ajustar próxima semana" at the bottom of `/training` Plan tab | User wants generation available even when current week is incomplete. |
| Default target week | `max(currentWeek + 1, lastConfirmedWeek + 1)`, capped at 23 | Covers the macroplan window; selector lets MK pick any future week. |
| Preview behavior | Editable per-block + confirm | User can fine-tune the proposal before locking it in. |
| Versioning | Each generation = new row with version+1; only one row per `(athlete, week)` ever holds `confirmed` status; older confirmed rows become `superseded`. | Full history kept; no destructive overwrites. |
| Extra prompt | Optional textarea ("Notas para la generación") | Lets MK steer one-off requests (`"énfasis en sled push"`). |
| PDFs delivery | Anthropic Files API + `cache_control: ephemeral` extended to 1h via beta header | Cheap, file_ids persistent across calls. |
| Citation policy | Per-session `rationale` field (1–2 sentences citing a specific PDF or the xlsx) + per-week `weekly_note` | User wants traceability per decision; gives MK a "why" check. |
| Scope per call | One athlete, one week | Simpler prompt, smaller context, easier to validate. |
| Output schema | Strict JSON validated with Zod; non-JSON → 502 with sanitized error | Anti-hallucination + crash-safe. |
| Source upload | One-off script `scripts/upload-training-sources.ts` writes `training_sources` rows with `file_id` | No runtime upload UI — keep surface small. |
| Fallback | When no confirmed row exists, `getDays(week, athlete)` falls back to the existing `PLAN` const for weeks 1–3 | Backwards compatible. |
| Anti-invention guard | If Claude has no citation for an adjustment, it returns the baseline session unchanged | Explicit in the system prompt + monitored by reviewer (per-session rationale must contain a known PDF/xlsx slug). |

## 4. Data model

### 4.1 New table `training_weeks`

```sql
create table training_weeks (
  id           uuid primary key default gen_random_uuid(),
  athlete      text not null check (athlete in ('MK','Xabi')),
  week         int  not null check (week between 1 and 23),
  version      int  not null default 1,
  status       text not null
                 check (status in ('draft','confirmed','superseded'))
                 default 'draft',
  plan_jsonb   jsonb not null,        -- Day[] with extended rationale field
  weekly_note  text,                  -- Claude's overarching note for the week
  generated_by text not null
                 check (generated_by in ('claude','manual','seed'))
                 default 'claude',
  extra_prompt   text,                -- the textarea content from MK at gen time
  source_summary jsonb,               -- snapshot of registros that fed this generation
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (athlete, week, version)
);

create index training_weeks_athlete_week_idx on training_weeks (athlete, week);
create index training_weeks_status_idx       on training_weeks (status, athlete, week);

alter table training_weeks enable row level security;

drop policy if exists "training_weeks_all" on training_weeks;
create policy "training_weeks_all" on training_weeks for all using (true) with check (true);
```

Only one row per `(athlete, week)` may have `status='confirmed'`; the API enforces this at write time (read-modify-write within a single SQL `update` that flips any prior confirmed row to `superseded`).

### 4.2 New table `training_sources`

```sql
create table training_sources (
  id          text primary key,                -- short slug
  file_id     text not null,                   -- Anthropic file_xxxx
  filename    text not null,
  description text,
  uploaded_at timestamptz not null default now()
);

alter table training_sources enable row level security;

drop policy if exists "training_sources_all" on training_sources;
create policy "training_sources_all" on training_sources for all using (true) with check (true);
```

Slug catalog (fixed): `pdf_tema5_cualidades`, `pdf_tema6_concurrente`, `pdf_tema7_macro`, `pdf_macro_meso_micro`, `pdf_periodizacion_tradicional_inversa`, `xlsx_master_23s`.

### 4.3 Migration file

`supabase/migrations/20260529130000_training_weeks.sql` — contains both tables and policies.

## 5. Generated plan JSON schema

```ts
// lib/training/generated.ts
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

export type GeneratedWeek = z.infer<typeof GeneratedWeek>;
```

`Day` types from `lib/plan-hyrox.ts` are extended in storage but the existing `Day` interface stays as the rendering contract. `rationale` is shown in the UI; it does not flow into the rendering used elsewhere (training history, heatmap, etc.).

## 6. Architecture

### 6.1 Files used / created

| File | Purpose |
|---|---|
| `supabase/migrations/20260529130000_training_weeks.sql` | Tables + policies. |
| `scripts/upload-training-sources.ts` | One-off upload of 6 PDFs + xlsx to Anthropic Files API; upserts `training_sources`. |
| `docs/training-sources/` | Stable copies of the source files in repo (for the script + for `docs/design-handoff/training/`). |
| `lib/training/generated.ts` | Zod schema + types for generated weeks. |
| `lib/anthropic/training-prompts.ts` | Exported `TRAINING_SYSTEM_PROMPT` (canonical, stable for caching). |
| `app/api/training/generate-week/route.ts` | POST: athlete + week + extra_prompt → calls Anthropic → validates JSON → inserts `training_weeks` draft. |
| `app/api/training/confirm-week/route.ts` | PATCH: week_id → flips matching `(athlete, week)` confirmed rows to `superseded` and the target to `confirmed`. |
| `lib/hooks/use-confirmed-week.ts` | `useConfirmedWeek(athlete, week)` reads the confirmed plan row if any. |
| `lib/plan-hyrox.ts` (modify) | `getDays(week, athlete, override?)` accepts an optional `Day[]` override; rendering paths use it. |
| `app/(app)/training/page.tsx` (modify) | Bottom-of-list button "Ajustar próxima semana" → `/training/adjust?week=…`. |
| `app/(app)/training/adjust/page.tsx` | Selector + context preview + extra-prompt textarea + Generar → preview. |
| `components/training/AdjustContextBox.tsx` | Shows last 2 weeks' completion + RPE + notes; pure read. |
| `components/training/AdjustPreview.tsx` | Renders the GeneratedWeek with inline-editable blocks + rationale + accept/regenerate. |
| `components/training/RationaleNote.tsx` | Small expandable italic gray note for `rationale` or `weekly_note`. |

### 6.2 Runtime flow

```
[/training Plan tab]
   ↓ tap "Ajustar próxima semana"
[/training/adjust?week=W]
   • renders <AdjustContextBox> showing last 2 weeks of registros
   • week selector (number input clamped 1..23)
   • <textarea> extra_prompt
   • [Generar]
       → POST /api/training/generate-week
         body: { athlete, target_week, extra_prompt }
         server:
           1. read training_sources rows → list of {slug, file_id}
           2. read registros for athlete, weeks [W-2, W-1]
           3. read training_weeks for (athlete, W-1) status=confirmed
           4. anthropic.messages.create({
                model: 'claude-sonnet-4-6',
                system: [{ type:'text', text: TRAINING_SYSTEM_PROMPT,
                            cache_control:{ type:'ephemeral' } }],
                messages: [{ role:'user', content: [
                  ...training_sources.map(s => ({
                    type:'document', source:{ type:'file', file_id:s.file_id },
                    cache_control:{ type:'ephemeral' }
                  })),
                  { type:'text', text: dynamicContext }
                ]}]
              })
           5. JSON.parse, Zod.GeneratedWeek.parse → on fail log + 502
           6. insert into training_weeks { status:'draft', ... }
         returns: { week_id, plan }
[preview]
   • renders <AdjustPreview plan={plan}>:
       - weekly_note shown via <RationaleNote variant="weekly">
       - for each Day: title, rpe, blocks editable inline
         (existing BlockRow inline-editor pattern), rationale via <RationaleNote variant="day">
   • [Regenerar] → resets state, re-runs the POST keeping extra_prompt
   • [Aceptar plan]
       → PATCH /api/training/confirm-week { week_id }
         server: in a single SQL statement:
           update training_weeks set status='superseded' where athlete=$1 and week=$2 and status='confirmed';
           update training_weeks set status='confirmed', confirmed_at=now() where id=$3;
         (sequenced; second update is conditional on first finishing)
   • redirect /training?week=W
```

### 6.3 Fallback / read path

`lib/plan-hyrox.ts::getDays(week, athlete)` is called by the page. Augment:

```ts
export function getDays(week: number, athlete: Athlete | null, override?: Day[]): Day[] {
  if (override && override.length > 0) return override;
  const p = PLAN[week];
  if (!p) return PLAN[Math.min(week, MAX_WEEK)][athlete ?? 'MK'] ?? PLAN[1].MK;
  return p[athlete ?? 'MK'] ?? p.MK;
}
```

The `/training` page reads the confirmed plan for the current week via `useConfirmedWeek(athlete, week)`, strips the `rationale` keys, and passes the resulting `Day[]` as `override`.

### 6.4 Prompt detail

`TRAINING_SYSTEM_PROMPT` (canonical, do not edit lightly — caching key):

```
Eres el coach asistente HYROX de MK y Xabi. Tu única fuente de verdad son los
documentos adjuntos: 5 PDFs académicos UFV (cualidades complementarias, entrenamiento
concurrente, macro, macro/meso/micro, periodización tradicional/inversa) y el Excel
MKXA_23S_v3 con el plan maestro de 23 semanas para ambos atletas.

REGLAS ESTRICTAS:
1. La estructura semanal, fase, RPE objetivo, %RM y días/semana vienen del Excel
   master plan para esa semana W. NO inventes fases ni objetivos.
2. Cada ajuste vs el baseline del Excel se justifica citando un PDF concreto por
   su nombre (p.ej. "Tema 6 §interferencia AMPK/mTOR") o la celda del Excel
   correspondiente. Sin cita explícita en el campo "rationale" → no se hace el
   ajuste y se devuelve la sesión baseline IDÉNTICA.
3. Las semanas de descarga del Excel (S8, S12, S17) son intocables.
4. Si el atleta presenta RPE > objetivo o nota de molestia/fatiga, ajusta el
   volumen o la carga aplicando S.G.A./supercompensación (macro_meso_micro.pdf)
   dentro del margen permitido por la fase Excel.
5. NO inventes ejercicios. Sólo nombres que aparecen en el plan maestro o que se
   citan literalmente en los PDFs.
6. Output: JSON puro siguiendo el schema descrito. Sin markdown, sin prosa fuera
   del JSON, sin "explicaciones" antes o después.

JSON SCHEMA esperado:
{
  "athlete": "MK" | "Xabi",
  "week": number,                 // 1..23
  "weekly_note": string,          // 2-3 frases, cita PDF o "Excel S{n}"
  "days": [{
    "key": "D1"|"D2"|"D3"|"D4"|"D5"|"D6",
    "title": string,
    "rpe": string,                // p.ej. "RPE 7-8"
    "blocks": [{
      "name": string,
      "sets": string,             // p.ej. "4x5", "30'", "5x400m"
      "load": string              // p.ej. "32.5kg", "Z2", "Banda M"
    }],
    "rationale": string           // 1-2 frases citando fuente o
                                   //   "Sin cambios respecto baseline Excel S{n}"
  }]
}
```

Dynamic user-turn text (per call):

```
ATLETA: {athlete}
SEMANA OBJETIVO: {target_week}
NOTAS EXTRA: "{extra_prompt or '(ninguna)'}"

PLAN CONFIRMADO PREVIO (S{W-1}):
{JSON of plan or "(no se generó previamente)"}

REGISTROS REALES ÚLTIMAS 2 SEMANAS:
{JSON registros[athlete][W-2..W-1] with completed,rpe,notes,week_note}

Genera la SEMANA {target_week} para {athlete} aplicando las reglas estrictas.
```

### 6.5 Cost / caching

- One Anthropic Files API upload per source (one-time, persistent).
- Each generation call: system prompt + 6 documents marked `cache_control: ephemeral` extended to 1h via the `extended-cache-ttl-2025-04-11` beta header. On a cache hit, only the small dynamic block is billed at full token rate.
- Estimated input: ~120k tokens of cached source + ~2k dynamic. Cache miss costs ~$0.45 once per hour; hits cost <$0.01 each. MK regenerating 4 times in an hour ≈ $0.47 worst case.

### 6.6 Anti-hallucination guards

1. **Prompt-level**: rule 2 and rule 5 force citations or no-op.
2. **Server-level**: after Zod parse, the server scans every `rationale` for at least one of the known slug substrings (e.g. `Tema 5`, `Tema 6`, `Excel S`, `macro_meso_micro`). If none of those appear in any `rationale` AND the day differs from the baseline Excel, log a warning. (Optional fail-closed mode: reject with 502 — opt-in via env var `STRICT_RATIONALE=1`.)
3. **UI-level**: the preview surfaces the `rationale` next to every Day. MK sees the citation. Editable inline so she can override silently.

## 7. UI behavior detail

### 7.1 Trigger on `/training`

Append below the sessions list, before the week-note textarea:

```tsx
<Link
  href={`/training/adjust?week=${nextWeek}`}
  className="mx-4 my-3 flex items-center justify-center gap-2 rounded-action border border-ink-soft py-3 text-[14px] font-medium text-ink"
>
  Ajustar próxima semana
</Link>
```

`nextWeek = max(currentWeek + 1, lastConfirmedWeek + 1)` clamped to 23.

### 7.2 `/training/adjust`

Layout described in the brainstorm section. Components:

- `<AdjustContextBox athlete week />` (read-only):
  - shows for each of the last 2 weeks: `S{n} — X/4 sesiones completadas`, RPE medio (mean of non-null RPEs), week_note text trimmed to 240 chars.
- `<select>` (Mona 14px) for target week — bound 1..23, default `nextWeek`.
- `<textarea>` for `extra_prompt`, max 500 chars, placeholder "Énfasis en sled, semana cómoda…"
- "Generar" button: bg ink, white text, rounded-action, h 56, full width.

While the POST runs:
- Button becomes "Pidiendo a Claude…" + `<MoodBlob mood="worried" size={28} withParticles={false} animate />` next to it. Disabled.

### 7.3 Preview

- `<AdjustPreview plan onAccept onRegenerate />`:
  - Header strip with `weekly_note` inside `<RationaleNote variant="weekly">` (italic gray, `text-[13px]`).
  - For each day: a card matching `SessionCard` visuals but in always-open edit mode. `<BlockRow>` is reused; we already have inline editors.
  - Per-Day `<RationaleNote variant="day">` collapsed by default, "Ver justificación" toggle.
- Bottom row:
  - "Regenerar" (border ink-soft, text-ink), `onRegenerate` resets state and POSTs again with the same body.
  - "Aceptar plan" (bg ink, text white).
- On accept: PATCH then `router.push('/training?week=' + week)`.

### 7.4 `<RationaleNote>`

```tsx
'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface Props { text: string; variant: 'weekly'|'day'; initiallyOpen?: boolean }

export function RationaleNote({ text, variant, initiallyOpen = false }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <div className="my-2">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[11px] font-medium text-ink-muted">
        {variant === 'weekly' ? 'Nota semanal' : 'Justificación'}
        <ChevronDown size={12} strokeWidth={1.5}
          className={clsx('transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <p className="mt-1 text-[13px] italic text-ink-muted">{text}</p>
      )}
    </div>
  );
}
```

## 8. Edge cases

| Case | Handling |
|---|---|
| `target_week > 23` | UI disallows via clamp; API rejects with 400. |
| `target_week <= currentWeek` | API accepts (lets MK pre-stage a re-think) but UI surfaces a yellow warning "Estás reescribiendo una semana ya en curso/pasada". |
| No `training_sources` rows | API returns 500 `"Las fuentes no están subidas; ejecuta scripts/upload-training-sources.ts"`. |
| Anthropic 5xx | API returns 502 generic; UI shows "Algo falló pidiendo a Claude. Reintenta." |
| Zod parse fail | Log server-side, return 502 with `"Modelo devolvió formato inesperado"`. No retry. |
| User confirms then regenerates | New version row created; previous confirmed becomes `superseded`. |
| No registros for last 2 weeks | API sends `"(sin registros)"` in dynamic context; Claude still uses Excel baseline. |
| Concurrent confirm races (two tabs) | The two-step update is sequential; whichever arrives second wins. Acceptable for 2-user app. |
| `extra_prompt` > 500 chars | UI clamps `maxLength`; API also rejects. |

## 9. Tests

- `lib/training/generated.ts` — Zod schema unit tests (valid, missing field, out-of-range week, oversized block array).
- `lib/anthropic/training-prompts.ts` — snapshot of system prompt (so a change is intentional).
- `app/api/training/generate-week/route.ts`:
  - mocked Anthropic returns valid JSON → 200 + draft row inserted.
  - mocked Anthropic returns invalid JSON → 502.
  - `STRICT_RATIONALE=1` + missing citation → 502.
  - missing sources → 500.
- `app/api/training/confirm-week/route.ts`:
  - sets prior confirmed to superseded + target to confirmed.
- `<RationaleNote>` — toggle open/close, accessibility name present.
- `<AdjustContextBox>` — renders last 2 weeks' content via mocked supabase.
- `<AdjustPreview>` — fires onAccept with full payload.
- `getDays` — returns override when given; falls back when not.

E2E (manual): MK on prod opens `/training/adjust?week=4`, generates, edits one block, confirms, returns to `/training` and sees week 4 reflecting the change.

## 10. Out of scope (deferred)

- Cross-athlete reasoning ("MK is tired, lighten Xabi's too").
- Generation of multi-week blocks (a full mesocycle in one call).
- Streaming the model output to render Day cards progressively.
- Diff view between baseline Excel and proposed week.
- "Rollback to baseline" button on a confirmed week.
- A reviewer-side admin page listing all generations with their `rationale` for audit.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Files API beta header changes | Pinned in `lib/anthropic/client.ts`; surface in repo README so we re-pin on SDK bumps. |
| 6 PDFs total ~30 MB; first cache write is the slowest | One-off cost once per hour. UI shows progress indicator with 30 s nominal. |
| Excel sheet has many merged cells / images that the model may misread | First few productions are user-supervised via preview; bad output → MK rejects or edits. |
| Model invents an exercise not in xlsx | Rule 5 + UI inline editing lets MK delete it. Optional `STRICT_RATIONALE=1` env flag escalates to server reject. |
| File_id is lost from `training_sources` | Re-run the script idempotently; it upserts. |
| Schema drift in `Day` requires migrating stored `plan_jsonb` | The Day interface used for render only needs `key,title,rpe,blocks`; the stored `rationale` field is additive and ignored by older code. |

## 12. References

- `docs/superpowers/specs/2026-05-28-mkxa-life-app-design.md` — original system spec; §7.3 Training.
- `docs/training-sources/` — copies of the 6 PDFs + xlsx used by the upload script and as design handoff.
- Anthropic Files API: https://docs.anthropic.com/en/docs/build-with-claude/files
- Prompt caching extended cache TTL beta: header `anthropic-beta: extended-cache-ttl-2025-04-11`.
