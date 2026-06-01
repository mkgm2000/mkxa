export const MOODS = [
  'happy', 'joyful', 'annoyed', 'worried', 'dizzy',
  'sad', 'angry', 'love', 'sleepy', 'neutral',
] as const;

export type Mood = (typeof MOODS)[number];

export const MOOD_ORDER: readonly Mood[] = [
  'joyful', 'happy', 'love', 'sleepy', 'neutral',
  'annoyed', 'worried', 'sad', 'angry', 'dizzy',
] as const;

export function isMood(x: unknown): x is Mood {
  return typeof x === 'string' && (MOODS as readonly string[]).includes(x);
}

export interface MoodTokens {
  cardFrom: string;
  cardTo: string;
  bodyTop: string;
  bodyMid: string;
  bodyBottom: string;
  cheek?: string;
  cheekOpacity?: number;
  ink: '#1b1d1f';
  label: string;
  emoji: string;
}

const T: Record<Mood, MoodTokens> = {
  happy:   { cardFrom: '#fff4d8', cardTo: '#ffd987', bodyTop: '#ffe4a8', bodyMid: '#fbc25a', bodyBottom: '#d88a1c', cheek: '#f29a72', cheekOpacity: 0.6,  ink: '#1b1d1f', label: 'Feliz',      emoji: '😊' },
  joyful:  { cardFrom: '#d6f5ea', cardTo: '#8de2c9', bodyTop: '#b8f0dd', bodyMid: '#54c6a6', bodyBottom: '#218e72', cheek: '#1f7a63', cheekOpacity: 0.35, ink: '#1b1d1f', label: 'Pleno',      emoji: '🤩' },
  annoyed: { cardFrom: '#ece0ff', cardTo: '#c4a3ff', bodyTop: '#d6bfff', bodyMid: '#9577f0', bodyBottom: '#6244b6',                                       ink: '#1b1d1f', label: 'Molesto',    emoji: '😤' },
  worried: { cardFrom: '#fff1d6', cardTo: '#ffd07a', bodyTop: '#ffe6b0', bodyMid: '#fac466', bodyBottom: '#cb8519',                                       ink: '#1b1d1f', label: 'Preocupado', emoji: '😟' },
  dizzy:   { cardFrom: '#ffe0e1', cardTo: '#ff9ca0', bodyTop: '#ffc4c6', bodyMid: '#f47179', bodyBottom: '#a13540',                                       ink: '#1b1d1f', label: 'Mareado',    emoji: '😵' },
  sad:     { cardFrom: '#e3ecff', cardTo: '#a3bcff', bodyTop: '#c4d3ff', bodyMid: '#7891f0', bodyBottom: '#3e57bf',                                       ink: '#1b1d1f', label: 'Triste',     emoji: '😢' },
  angry:   { cardFrom: '#ffdcdc', cardTo: '#ff7e7e', bodyTop: '#ffbbbb', bodyMid: '#ee5e5e', bodyBottom: '#982929',                                       ink: '#1b1d1f', label: 'Enfadado',   emoji: '😡' },
  love:    { cardFrom: '#ffe2ec', cardTo: '#ffa3bc', bodyTop: '#ffd0db', bodyMid: '#ff80a0', bodyBottom: '#b6315a',                                       ink: '#1b1d1f', label: 'Enamorado',  emoji: '😍' },
  sleepy:  { cardFrom: '#ece4ff', cardTo: '#b9a3e8', bodyTop: '#e0d2ff', bodyMid: '#a48be0', bodyBottom: '#5b449a',                                       ink: '#1b1d1f', label: 'Adormilado', emoji: '😴' },
  neutral: { cardFrom: '#f0eee9', cardTo: '#d6cfc1', bodyTop: '#f2eadb', bodyMid: '#cdbe9d', bodyBottom: '#7d6d4d',                                       ink: '#1b1d1f', label: 'Neutral',    emoji: '😐' },
};

export function getMoodTokens(m: Mood): MoodTokens {
  return T[m];
}
