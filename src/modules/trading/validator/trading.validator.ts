import { z } from 'zod';
import { TradeType, TradeStatus } from '@prisma/client';

export const triggerTradeSchema = z.object({
  tradeType: z.nativeEnum(TradeType).optional().default(TradeType.MORNING),
});

export const submitTradeCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, 'Trade code is too short')
    .max(16, 'Trade code is too long')
    .regex(/^[A-Za-z0-9]+$/, 'Trade code must be alphanumeric'),
});

export const getTradeSchema = z.object({
  status: z.nativeEnum(TradeStatus).optional(),
  tradeType: z.nativeEnum(TradeType).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 10),
});

export type TriggerTradeInput = z.infer<typeof triggerTradeSchema>;
export type SubmitTradeCodeInput = z.infer<typeof submitTradeCodeSchema>;
export type GetTradeInput = z.infer<typeof getTradeSchema>;
