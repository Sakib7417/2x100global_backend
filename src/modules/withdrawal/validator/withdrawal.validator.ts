import { z } from 'zod';
import { WithdrawalStatus } from '@prisma/client';

export const createWithdrawalSchema = z.object({
  amount: z.string().refine((val) => parseFloat(val) >= 10, 'Minimum withdrawal is 10 USDT'),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  walletType: z.string(),
  withdrawPassword: z.string().min(1, 'Withdraw password is required'),
});

export const getWithdrawalSchema = z.object({
  status: z.nativeEnum(WithdrawalStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 10),
});

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;
export type GetWithdrawalInput = z.infer<typeof getWithdrawalSchema>;
