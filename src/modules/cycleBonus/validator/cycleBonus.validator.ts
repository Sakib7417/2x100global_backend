import { z } from 'zod';
import { CycleBonusStatus } from '@prisma/client';

export const getCycleBonusSchema = z.object({
  status: z.nativeEnum(CycleBonusStatus).optional(),
  cycleNumber: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 10),
});

export type GetCycleBonusInput = z.infer<typeof getCycleBonusSchema>;
