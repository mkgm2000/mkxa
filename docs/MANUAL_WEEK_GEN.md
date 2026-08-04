# Manual Week Generation Protocol — MKXA HYROX Valencia 2026

Followed by Claude every time the user asks to generate or revise a training week manually (no Anthropic API call). Mirrors what `/api/training/generate-week` does, but executed by hand because credits / preference.

---

## 1 · Sources of truth (in priority order)

1. **`docs/training-sources/xlsx_master_23s.txt`** — Excel "Vision Macro". Authority on PHASE, RPE objetivo, VOLUMEN, INTENSIDAD, %RM and OBJETIVO/NOTAS por semana. This dictates the IDENTITY of the week (e.g. S6 = "Tolerancia trineo — pasos cortos + respiracion", S15 = supra-HYROX pico). NEVER contradict it.
2. **`docs/training-sources/xlsx_bateria_ejercicios.txt`** — Battery of exercises with category (F/H/C/R/T), reps refs, RM por atleta, transferencia HYROX. SOURCE OF ALL EXERCISE NAMES. Don't invent exercises outside this catalog.
3. **DB `training_weeks` confirmed plans** — the last 2-3 confirmed weeks for both athletes. Format reference + carry-forward of cargas reales que funcionaron.
4. **DB `registros`** — completed, RPE real, notes, week_note, custom_blocks, extra_blocks, deleted_blocks for the entire history. Strongest signal of what to adjust.
5. **PDFs UFV (background knowledge)** — Tema 5 (cualidades / recuperación), Tema 6 (interferencia AMPK/mTOR), Tema 7 (macrociclo / pico de forma), Periodización tradicional/inversa, Macro/meso/micro. Cite by name in `rationale`.
6. **`docs/training-sources/pdf_rulebook_hyrox_doubles.txt`** — competition rules. Distances, weights, station order, sharing logic Doubles Mixed.

---

## 2 · Microciclo skeleton per Excel master

| Bloque  | Semanas  | Días | Estructura |
|---------|----------|------|------------|
| Intro / Base | S1-S8, S22 | 4 | Mié=Fuerza · Jue=Z2 · Vie=HYROX · Sáb=Intervalos |
| Umbral | S9-S12, S21 | 5 | Lun=Z2 · Mar=Fuerza+HIIT · Jue=FuerzaSup+HYROX · Vie=Intervalos+Fatiga · Sáb=Z2largo |
| Realización / Competitivo | S13-S20 | 6 | Lun=Z2 · Mar=Fuerza+HIIT · Mié=FuerzaSup+HYROX · Jue=Intervalos+Fatiga · Vie=Fuerza · Sáb=Z2largo |

Deload weeks (intocables): **S8, S12, S17**. -30% volumen, ~60% cargas.

Sobrecarga / pico SUPRA-HYROX: **S15, S19**. WB +2kg, Farmer +4kg, Sled placa extra.

---

## 3 · Procedure per generation request

### Step 0 — Confirm scope
- Which weeks? (current + N forward, or revise one)
- Are there NEW registros / notes the user just shared verbally that aren't in DB yet?
- Does the user want to ADD a session that the Excel doesn't include? (e.g. S6 extra HIIT day). Treat as user-driven scope expansion, not deviation.

### Step 1 — Pull fresh state
```
SELECT athlete,week,day_key,completed,rpe,notes,week_note,
       custom_blocks,extra_blocks,deleted_blocks
FROM registros
WHERE week BETWEEN (target-4) AND (target-1)
ORDER BY week,athlete,day_key;
```
Plus last 1-2 confirmed `training_weeks` for both athletes.

### Step 2 — Read the Excel row for the target week
Open `xlsx_master_23s.txt`. Find the row `S{week}`. Extract:
- Fase (Base / Umbral / Realización / Competitivo / Descarga)
- Días planificados (4 / 5 / 6)
- RPE objetivo
- Volumen
- Intensidad
- % RM
- **Objetivo / Notas** ← this is the THEME of the week. Build the weekly_note around it.

### Step 3 — Design the week
For each day_key:
- **title**: only the session type. `"Fuerza"`, `"Z2 Suave"`, `"HYROX Específico"`, `"Series Carrera"`, `"Fuerza + HIIT"`, etc. NUNCA día de semana ni duración.
- **rpe**: `"RPE X"` o `"RPE X-Y"`. Match Excel target.
- **blocks**: ejercicios del Battery. `name` SOLO el ejercicio (sin códigos FXX/HXX, sin paréntesis "sustituye…", sin "transfer…"). `sets` compacto (`"4x5"`, `"30'"`, `"3x250m"`). `load` corto (`"40kg"`, `"6:00-6:15/km"`, `"BW"`, `"Pareja 50 TOTAL"`).
- **rationale**: aquí va TODO el contexto: cita Excel ("Excel S{N}-{atleta}-{D}: …"), Battery ("Battery FXX = …"), PDFs ("Tema 6 §interferencia"), Rulebook, registros previos con RPE concreto, ajustes vs registros, transfer HYROX.

Cargas: respect RM por atleta (MK 55/75/30, Xabi 60/80/90) y el % RM del Excel para esa semana. Calcular individualmente cada uno.

### Step 4 — Apply feedback rules (CRITICAL)
- **Ajustes manuales repetidos en custom_blocks ≥2 semanas** → nueva línea base.
- **Extras añadidos ≥2 semanas seguidas** → promociona a bloque oficial.
- **Bloques eliminados con razón en notes** → NO reponer, buscar alternativa en Battery con transferencia equivalente.
- **Notes con palabras "molestia", "dolor", "sobrecargado", "lesión", "no pude"** → bajar intensidad esa zona corporal, citar Tema 5/6.
- **RPE real > RPE objetivo Excel ≥1 punto sostenido en últimas 2 semanas** → reducir volumen o carga.
- **completed=false repetido en el mismo D-key** → reubicar a otro día o reducir.
- **Si el user pide AÑADIR un día extra** (D5/D6 fuera del esqueleto Excel para la fase) → incluirlo respetando los ejercicios del Battery, citar en rationale "fuera de Excel, añadido por user request {fecha}".

### Step 5 — Format rules (FROM MEMORY — non-negotiable)
- `block.name` SOLO el ejercicio. NUNCA códigos battery (F01, H03), NUNCA anotaciones "(pareja: …)", NUNCA "sustituye Sled Push", NUNCA "transfer BBJ".
- NO mini-circuitos como sub-secciones. Si hay un segundo bloque dentro de la misma sesión, sus blocks van listados normales sin prefix `"Mini-circuito · "` (rejected by user en S5).
- `title` solo el tipo. PROHIBIDO día de semana o duración.
- `rpe` solo `"RPE X"`.
- `load` corto. Descanso solo si imprescindible y muy corto.
- Toda justificación va a `rationale` (hasta 3000 chars).
- `weekly_note` (hasta 4000 chars) explica el porqué de la semana citando el Excel + registros más relevantes.

### Step 6 — Persist
Script pattern (see `/tmp/build_s6_s7_s8.py` for reference):
```python
for week in WEEKS_TO_PERSIST:
    for athlete in ("MK", "Xabi"):
        supersede(athlete, week)              # PATCH status='confirmed' → 'superseded'
    insert_confirmed("MK", week, mk_days, weekly_note)    # version = max+1
    insert_confirmed("Xabi", week, xabi_days, weekly_note)
```
- Anon Supabase REST. URL + key from `.env.local`.
- One row per (athlete, week, version). `status = 'confirmed'`, `generated_by = 'manual'`, `source_summary = {method, basis}`.
- NEVER touch registros from inside the generation script. Registros pertenecen al usuario, no a Claude.
- NEVER touch a deload week (S8/S12/S17) baseline — supersede + revise OK only si el user pide explícitamente.

### Step 7 — Report
- Tabla compact (S{N} D1/D2/D3/D4 [/D5/D6]) per atleta.
- Cita explícita del tema del Excel para esa semana.
- Lista de feedbacks de registros incorporados.

---

## 4 · Anti-patterns observed in history

- **S5-v2 problema**: `block.name = "KB Swing (F20) · sustituye Sled Push"`. User rejected — ahora `name = "KB Swing"` only.
- **S5-v3 problema**: mini-circuito prefix `"Mini-circuito final · Sandbag Carry"`. User rejected en S6 — ahora los bloques adicionales van como blocks normales.
- **Olvido feedback MK S5-D1**: "hay mucha pierna y poco tren superior" — añadir SIEMPRE balance tren superior/inferior, incluir Press Banca / Thruster / Remo cuando el feedback se repita.
- **Box Jump en S5**: Xabi+MK lo sustituyeron por trabajo de hombro. Si un ejercicio se reemplaza ≥2 weeks seguidas, fuera del Excel base.

---

## 4.5 · MANDATO DE ORIGINALIDAD (pedido explícito por Xabier 2026-07-24)

**Cada semana debe ser DISTINTA y entretenida — no el mismo template de siempre.** Aprobado en S12. Reglas:

- **Rota ejercicios frescos de la batería.** No repetir siempre F01 Sentadilla / F02 PM / F03 Press. Usar el catálogo COMPLETO: unilateral (F06 Búlgara, F12-F16, subida a cajón), core variado (R04 Pallof, R06 Dead Bug, R08 Suitcase, R10 Russian Twist en vez de siempre R01 Plancha), potencia/KB (F17 Thruster, F18 Push Press, F19 Snatch KB, F20 KB Swing, F21 Devils Press, F24 Power Clean, F25 Med Ball Slam, F26 Single-arm Swing), pliometría ligera (F22 Box Jump, F23 Broad Jump, F27 Skater Hops).
- **Varía el FORMATO de sesión**, no solo los ejercicios: series en pirámide (200-400-600-400-200) vs 5x400, tempo, progresivos, énfasis unilateral, HYROX flow con estaciones distintas. SIN etiquetas de mini-circuito (bloques listados normales).
- **Usa web search** para nutrir el diseño con ideas útiles y con transferencia real a HYROX (KB→trineo/wall ball, unilateral→carrera/lunges, etc.). Cita fuentes en el rationale.
- **Sigue siendo útil y respeta todo lo demás**: fase del Excel, cargas por RM/atleta, registros + feedback, deload intocable, batería como fuente de nombres. Originalidad ≠ inventar ejercicios fuera de la batería ni ignorar la periodización.
- **Justifica cada elección "rara" en el rationale** con su transferencia (por qué ese ejercicio ayuda a HYROX).

## 4.6 · Log de progresión (mejorar iterando — mantener al día)

| Semana | Fecha gen | Enfoque | Notas clave |
|---|---|---|---|
| S11 | 2026-07-24 | REACTIVACIÓN tras ~3 sem bajo volumen (último confirmado S8). Moderado, base, sin picos. | Cargas S6 mantenidas · Z2 por respiración (MK RPE9 a 6:34/km) · HYROX reducido sin trineo (se saltó S5-S7) · series controladas. |
| S12 | 2026-07-24 | DESCARGA VARIADA — 1ª semana con mandato de originalidad. Unilateral + KB + core anti-rotación + pirámide. | Búlgara/RDL 1-pierna/subida cajón · KB Swing+Snatch (transfer trineo/WB) · Pallof · Med Ball Slam · D4 pirámide 200-400-600-400-200. Fuentes: PureGym, Hybrid Pro Coach, Peak Strength. |
| S13 | 2026-08-04 | REALIZACIÓN 4 días — fuerza+potencia, run/walk, compromised-running brick, escalera. | Incorpora cambios MK S12: KB Swing 16kg (le encanta, lo pidió), fuera subida a cajón + Wall Balls (las quita), Snatch cubre overhead. FIX correr RPE 9 crónico → D2 run/walk. D3 brick run+lunges (compromised running). D4 escalera 600-500-400-300-200 (≠ pirámide S12). Fuentes: Xendurance/ROXFIT, Optimal Readiness/Doc Lyss. |

> Al generar la siguiente semana: leer este log, NO repetir el mismo enfoque de la semana anterior, y añadir una fila nueva.
>
> **Señales crónicas a vigilar**: (1) correr = RPE 9 para MK repetido (S6, S12) → mantener run/walk / intensidad controlada hasta que baje. (2) MK quita Wall Balls y trabajo de cajón repetidamente → no reponer sin alternativa. (3) MK adora el KB Swing → mantener.
>
> **Reglas fijas de Xabier (SIEMPRE)**: (a) Día de series/carrera = SOLO calentamiento + series, sin core ni extras añadidos (pedido S13). (b) Día de fuerza debe incluir un ejercicio de abdomen. (c) Nada de Suitcase Carry en fuerza (sustituido por abdomen en S13).

---

## 5 · Quick reference — el resto de semanas en orden

| S | Fecha | Fase | RPE | Vol | Int | %RM | Objetivo |
|---|---|---|---|---|---|---|---|
| 1 | 11 may | Introductorio | 7 | Alto | Baja | 55% | Construir base — técnica + Z2 + primera toma series |
| 2 | 18 may | Introductorio | 7 | Alto | Baja | 60% | Economizar carrera — +5% carga · +1 serie pista |
| 3 | 25 may | Base aeróbica | 7 | Alto | Baja | 60% | Controlar fatiga — primer HYROX técnico juntos |
| 4 | 01 jun | Base aeróbica | 7 | Alto | Media | 65% | Primera transferencia — correr + estaciones |
| 5 | 08 jun | Base aeróbica | 8 | Med-Alt | Media | 70% | Subir umbral — 400m más rápidos |
| 6 | 15 jun | Base aeróbica | 8 | Medio | Med-Alt | 75% | Tolerancia trineo — pasos cortos + respiración |
| 7 | 22 jun | Base aeróbica | 8 | Medio | Media | 75% | Lunges y burpees eficientes — proteger cuads |
| 8 | 29 jun | **Descarga** | 6 | Bajo | Baja | 65% | Mini-descarga — consolidar sin fatiga acumulada |
| 9 | 06 jul | Umbral | 8 | Medio | Alta | 80-85% | Ritmo objetivo — primeras series a ritmo HYROX |
| 10 | 13 jul | Umbral | 8 | Medio | Alta | 80% | Sincronía en pareja — quien marca el paso |
| 11 | 20 jul | Umbral | 8 | Alt-Med | Alta | 75% | Simulacro 80% — probar estrategia sin romperse |
| 12 | 27 jul | **Descarga** | 6 | Bajo | Media | 65% | Supercompensación |
| 13 | 03 ago | Realización | 8 | Alto | Alta | 80% | Primer bloque 6 días |
| 14 | 10 ago | Realización | 8 | Alto | Alta | 82% | Resistencia específica |
| 15 | 17 ago | Realización | 9 | Med-Alt | Muy alta | 85% | **SUPRA-HYROX** Potencia + velocidad |
| 16 | 24 ago | Realización | 8 | Medio | Alta | 80% | Simulacro 90% |
| 17 | 31 ago | **Descarga** | 6 | Bajo | Media | 65% | Descarga activa |
| 18 | 07 sep | Competitivo | 8 | Medio | Alta | 82% | Ritmo competición |
| 19 | 14 sep | Competitivo | 9 | Med-Alt | Muy alta | 85% | **PICO FORMA** simulacro 100% |
| 20 | 21 sep | Competitivo | 8 | Medio | Alta | 80% | Ajuste fino |
| 21 | 28 sep | Competitivo | — | — | — | — | Tapering |
| 22 | 05 oct | Pre-competición | — | — | — | — | Final taper |
| 23 | 12 oct → 16 oct RACE | Competición | — | — | — | — | HYROX Valencia |
