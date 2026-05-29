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
