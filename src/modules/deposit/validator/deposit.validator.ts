import { z } from 'zod';
import { DepositStatus } from '@prisma/client';

export const createDepositSchema = z.object({
  amount: z.union([z.string(), z.number()])
    .transform((val) => String(val))
    .refine((val) => parseFloat(val) >= 100, 'Minimum deposit is 100 USDT'),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid sender address'),
  receiverAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid receiver address'),
  tokenContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token contract'),
  network: z.string(),
});

export const getDepositSchema = z.object({
  status: z.nativeEnum(DepositStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 10),
});

export const updateDepositSchema = z.object({
  status: z.nativeEnum(DepositStatus),
  rejectionReason: z.string().optional(),
});

export type CreateDepositInput = z.infer<typeof createDepositSchema>;
export type GetDepositInput = z.infer<typeof getDepositSchema>;
export type UpdateDepositInput = z.infer<typeof updateDepositSchema>;
