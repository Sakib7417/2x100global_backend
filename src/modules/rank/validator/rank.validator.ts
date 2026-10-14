import { z } from 'zod';

export const evaluateRankSchema = z.object({
  userId: z.string().uuid().optional(),
});

export const getRanksSchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 10),
});

export type EvaluateRankInput = z.infer<typeof evaluateRankSchema>;
export type GetRanksInput = z.infer<typeof getRanksSchema>;
