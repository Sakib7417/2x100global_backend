import { z } from 'zod';
import { MIN_POOL_BONUS_REQUEST_AMOUNT } from '../constants/poolBonus.constants';

const requestTypeSchema = z.literal('WITHDRAW');

export const createPoolBonusRequestSchema = z.object({
  requestType: requestTypeSchema,
  requestedAmount: z.number().positive('Amount must be positive').min(MIN_POOL_BONUS_REQUEST_AMOUNT, `Minimum amount is ${MIN_POOL_BONUS_REQUEST_AMOUNT}`),
  destinationAddress: z.string().min(1, 'Destination address is required for withdrawal'),
  network: z.string().optional(),
  withdrawPassword: z.string().min(1, 'Withdraw password is required'),
});

export const approvePoolBonusRequestSchema = z.object({
  adminNote: z.string().max(500).optional(),
});

export const updatePoolBonusRequestSchema = z.object({
  approvedAmount: z.number().positive('Approved amount must be positive'),
  adminNote: z.string().max(500).optional(),
});

export const rejectPoolBonusRequestSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(500),
});

export type CreatePoolBonusRequestInput = z.infer<typeof createPoolBonusRequestSchema>;
export type ApprovePoolBonusRequestInput = z.infer<typeof approvePoolBonusRequestSchema>;
export type UpdatePoolBonusRequestInput = z.infer<typeof updatePoolBonusRequestSchema>;
export type RejectPoolBonusRequestInput = z.infer<typeof rejectPoolBonusRequestSchema>;
