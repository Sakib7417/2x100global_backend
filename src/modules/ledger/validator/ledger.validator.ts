import { z } from 'zod';
import { LedgerType } from '@prisma/client';

export const getLedgerSchema = z.object({
  type: z.nativeEnum(LedgerType).optional(),
  walletId: z.string().uuid().optional(),
  referenceId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 10),
});

export type GetLedgerInput = z.infer<typeof getLedgerSchema>;
