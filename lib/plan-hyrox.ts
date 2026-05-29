import type { Athlete } from '@/lib/athlete-context';

export interface Block {
  name: string;
  sets: string;
  load: string;
}

export type DayKey = 'D1' | 'D2' | 'D3' | 'D4';

export interface Day {
  key: DayKey;
  title: string;
  rpe: string;
  blocks: Block[];
}

export type WeekPlan = Record<Athlete, Day[]>;
export type Plan = Record<number, WeekPlan>;

export const START_DATE = new Date('2026-05-11');

export const PLAN: Plan = {
  1: {
    MK: [
      {
        key: 'D1', title: 'Fuerza', rpe: 'RPE 6-7', blocks: [
          { name: 'Sentadilla', sets: '4x8', load: '30.0kg' },
          { name: 'RDL', sets: '4x8', load: '40.0kg' },
          { name: 'Press Banca', sets: '4x10', load: '17.5kg' },
          { name: 'Dominadas asistidas', sets: '3x6', load: 'Banda M' },
          { name: 'Hip Thrust', sets: '3x12', load: '30kg' },
          { name: 'Plancha', sets: '3x30"', load: 'BW' },
        ],
      },
      {
        key: 'D2', title: 'Z2 Suave', rpe: 'RPE 4-5', blocks: [
          { name: 'Carrera Z2 continua', sets: "30'", load: '6:20-6:35/km' },
          { name: 'Movilidad post', sets: "10'", load: 'Cadera + tobillo' },
        ],
      },
      {
        key: 'D3', title: 'HYROX Técnico', rpe: 'RPE 5-6', blocks: [
          { name: 'Ski Erg', sets: '3x250m', load: 'Técnica' },
          { name: 'Remo', sets: '3x250m', load: 'Técnica' },
          { name: 'Wall Balls', sets: '3x10', load: '6kg' },
          { name: 'Farmer Carry', sets: '3x40m', load: '2x12kg' },
          { name: 'Sled Push', sets: '3x20m', load: 'Ligero' },
          { name: 'Sled Pull', sets: '3x20m', load: 'Ligero' },
          { name: 'Burpee Broad Jump', sets: '2x8', load: 'Técnica' },
        ],
      },
      {
        key: 'D4', title: 'Series Carrera', rpe: 'RPE 6-7', blocks: [
          { name: 'Calentamiento', sets: "10'", load: 'Trote suave' },
          { name: 'Series 400m', sets: '5x400m', load: '2:08-2:14' },
          { name: 'Vuelta a la calma', sets: "5'", load: 'Trote suave' },
        ],
      },
    ],
    Xabi: [
      {
        key: 'D1', title: 'Fuerza', rpe: 'RPE 6-7', blocks: [
          { name: 'Sentadilla Búlgara', sets: '3x8 c/pierna', load: '8kg' },
          { name: 'Hip Thrust', sets: '3x12', load: '16kg' },
          { name: 'Press Mancuerna', sets: '4x10', load: '10kg' },
          { name: 'Dominadas', sets: '3x6', load: 'BW' },
          { name: 'Plancha', sets: '3x30"', load: 'BW' },
        ],
      },
      {
        key: 'D2', title: 'Z2 Suave', rpe: 'RPE 4-5', blocks: [
          { name: 'Carrera Z2 continua', sets: "30'", load: '7:00-7:15/km' },
          { name: 'Movilidad post', sets: "10'", load: 'Cadera + tobillo' },
        ],
      },
      {
        key: 'D3', title: 'HYROX Técnico', rpe: 'RPE 5-6', blocks: [
          { name: 'Ski Erg', sets: '3x250m', load: 'Técnica' },
          { name: 'Remo', sets: '3x250m', load: 'Técnica' },
          { name: 'Wall Balls', sets: '3x10', load: '9kg' },
          { name: 'Farmer Carry', sets: '3x40m', load: '2x18kg' },
          { name: 'Sled Push', sets: '3x20m', load: 'Ligero' },
          { name: 'Sled Pull', sets: '3x20m', load: 'Ligero' },
          { name: 'Burpee Broad Jump', sets: '2x8', load: 'Técnica' },
        ],
      },
      {
        key: 'D4', title: 'Series Carrera', rpe: 'RPE 6-7', blocks: [
          { name: 'Calentamiento', sets: "10'", load: 'Trote suave' },
          { name: 'Series 400m', sets: '5x400m', load: '2:25-2:35' },
          { name: 'Vuelta a la calma', sets: "5'", load: 'Trote suave' },
        ],
      },
    ],
  },
  2: {
    MK: [
      {
        key: 'D1', title: 'Fuerza', rpe: 'RPE 6', blocks: [
          { name: 'Sentadilla', sets: '4x5', load: '30.0kg' },
          { name: 'RDL', sets: '4x4', load: '40.0kg' },
          { name: 'Press Banca', sets: '4x8', load: '20.0kg' },
          { name: 'Remo Mancuerna', sets: '3x10 c/lado', load: 'Moderado' },
          { name: 'Plancha', sets: '3x30"', load: 'BW' },
        ],
      },
      {
        key: 'D2', title: 'Z2 Suave', rpe: 'RPE 5', blocks: [
          { name: 'Carrera Z2 continua', sets: "35-40'", load: '6:15-6:45/km' },
          { name: 'Movilidad post', sets: "10'", load: 'Cadera + tobillo' },
        ],
      },
      {
        key: 'D3', title: 'HYROX Técnico', rpe: 'RPE 6', blocks: [
          { name: 'Ski Erg', sets: '2-3x250m', load: 'Técnica' },
          { name: 'Remo', sets: '2-3x250m', load: 'Técnica' },
          { name: 'Wall Balls', sets: '2-3x10', load: '6kg' },
          { name: 'Sled Push', sets: '2-3x20m', load: 'Ligero' },
          { name: 'Sled Pull', sets: '2-3x20m', load: 'Ligero' },
          { name: 'Burpee Broad Jump', sets: '2-3x10', load: 'Técnica' },
        ],
      },
      {
        key: 'D4', title: 'Series Carrera', rpe: 'RPE 7', blocks: [
          { name: 'Calentamiento', sets: "10'", load: 'Trote suave' },
          { name: 'Series 400m', sets: '6x400m', load: '2:05-2:12' },
          { name: 'Vuelta a la calma', sets: "5'", load: 'Trote suave' },
        ],
      },
    ],
    Xabi: [
      {
        key: 'D1', title: 'Fuerza', rpe: 'RPE 6', blocks: [
          { name: 'Sentadilla Búlgara', sets: '3x8 c/pierna', load: '10-12kg' },
          { name: 'RDL una pierna', sets: '3x8 c/pierna', load: '12-14kg' },
          { name: 'Dominadas', sets: '3x6', load: 'BW' },
          { name: 'Hip Thrust', sets: '3x12', load: '16-20kg' },
        ],
      },
      {
        key: 'D2', title: 'Z2 Suave', rpe: 'RPE 5', blocks: [
          { name: 'Carrera Z2 continua', sets: "35-40'", load: '6:15-6:45/km' },
          { name: 'Movilidad post', sets: "10'", load: 'Cadera + tobillo' },
        ],
      },
      {
        key: 'D3', title: 'HYROX Técnico', rpe: 'RPE 6', blocks: [
          { name: 'Ski Erg', sets: '2-3x250m', load: 'Técnica' },
          { name: 'Remo', sets: '2-3x250m', load: 'Técnica' },
          { name: 'Wall Balls', sets: '2-3x10', load: '6-9kg' },
          { name: 'Sled Push', sets: '2-3x20m', load: 'Ligero' },
          { name: 'Sled Pull', sets: '2-3x20m', load: 'Ligero' },
          { name: 'Burpee Broad Jump', sets: '2-3x10', load: 'Técnica' },
        ],
      },
      {
        key: 'D4', title: 'Series Carrera', rpe: 'RPE 7', blocks: [
          { name: 'Calentamiento', sets: "10'", load: 'Trote suave' },
          { name: 'Series 400m', sets: '6x400m', load: '2:05-2:12' },
          { name: 'Vuelta a la calma', sets: "5'", load: 'Trote suave' },
        ],
      },
    ],
  },
  3: {
    MK: [
      {
        key: 'D1', title: 'Fuerza + Trineo', rpe: 'RPE 5-6', blocks: [
          { name: 'Sentadilla', sets: '3x5', load: '30.0kg' },
          { name: 'Dominadas asistidas', sets: '2x6', load: 'Banda M' },
          { name: 'Sled Push', sets: '3x20m', load: '20kg' },
          { name: 'Sled Pull', sets: '3x20m', load: '20kg' },
          { name: 'Plancha', sets: '2x30"', load: 'BW' },
        ],
      },
      {
        key: 'D2', title: 'Z2 Descarga', rpe: 'RPE 3-4', blocks: [
          { name: 'Carrera Z2 continua', sets: "25'", load: 'Libre' },
          { name: 'Movilidad post', sets: "15'", load: 'Full body' },
        ],
      },
      {
        key: 'D3', title: 'HYROX Técnico', rpe: 'RPE 5', blocks: [
          { name: 'Ski Erg', sets: '3x250m', load: 'Técnica' },
          { name: 'Remo', sets: '3x250m', load: 'Técnica' },
          { name: 'Wall Balls', sets: '3x10', load: '6kg' },
          { name: 'Farmer Carry', sets: '3x40m', load: '2x12kg' },
          { name: 'Burpee Broad Jump', sets: '2x8', load: 'Técnica' },
        ],
      },
      {
        key: 'D4', title: 'Series Carrera', rpe: 'RPE 5', blocks: [
          { name: 'Calentamiento', sets: "10'", load: 'Trote suave' },
          { name: 'Series 400m', sets: '4x400m', load: 'Libre' },
          { name: 'Vuelta a la calma', sets: "10'", load: 'Trote muy suave' },
        ],
      },
    ],
    Xabi: [
      {
        key: 'D1', title: 'Fuerza + Trineo', rpe: 'RPE 5-6', blocks: [
          { name: 'Sentadilla', sets: '3x5', load: '35.0kg' },
          { name: 'RDL', sets: '3x6', load: '47.5kg' },
          { name: 'Press Banca', sets: '3x8', load: '50.0kg' },
          { name: 'Dominadas', sets: '2x6', load: 'BW' },
          { name: 'Sled Push', sets: '3x20m', load: '30kg' },
          { name: 'Sled Pull', sets: '3x20m', load: '30kg' },
          { name: 'Plancha', sets: '2x35"', load: 'BW' },
        ],
      },
      {
        key: 'D2', title: 'Z2 Descarga', rpe: 'RPE 3-4', blocks: [
          { name: 'Carrera Z2 continua', sets: "25'", load: 'Libre' },
          { name: 'Movilidad post', sets: "15'", load: 'Full body' },
        ],
      },
      {
        key: 'D3', title: 'HYROX Técnico', rpe: 'RPE 5', blocks: [
          { name: 'Ski Erg', sets: '3x250m', load: 'Técnica' },
          { name: 'Remo', sets: '3x250m', load: 'Técnica' },
          { name: 'Wall Balls', sets: '3x10', load: '9kg' },
          { name: 'Farmer Carry', sets: '3x40m', load: '2x18kg' },
          { name: 'Burpee Broad Jump', sets: '2x8', load: 'Técnica' },
        ],
      },
      {
        key: 'D4', title: 'Series Carrera', rpe: 'RPE 5', blocks: [
          { name: 'Calentamiento', sets: "10'", load: 'Trote suave' },
          { name: 'Series 400m', sets: '4x400m', load: 'Libre' },
          { name: 'Vuelta a la calma', sets: "10'", load: 'Trote muy suave' },
        ],
      },
    ],
  },
};

export const MAX_WEEK = Math.max(...Object.keys(PLAN).map((k) => Number(k)));

/** Week number (1-based) given current date. Capped at last defined week. */
export function getCurrentWeek(now: Date = new Date()): number {
  const ms = now.getTime() - START_DATE.getTime();
  const diff = Math.floor(ms / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, diff + 1);
}

/** Days array for a given week + athlete, with safe fallback. */
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

/** Display label "DD mmm – DD mmm" for week. */
export function getWeekDates(week: number, locale = 'es-ES'): string {
  const s = new Date(START_DATE);
  s.setDate(s.getDate() + (week - 1) * 7);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const f = (d: Date) =>
    d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return `${f(s)} – ${f(e)}`;
}
