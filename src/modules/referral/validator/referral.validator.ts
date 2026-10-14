import { z } from 'zod';

export const validateReferralCodeSchema = z.object({
  referralCode: z.string().min(6, 'Referral code must be at least 6 characters'),
});

export const getReferralTreeSchema = z.object({
  maxLevel: z.string().optional().transform((val) => val ? parseInt(val) : 5),
});

export const getReferralBonusesSchema = z.object({
  type: z.string().optional(),
  level: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 10),
});

export type ValidateReferralCodeInput = z.infer<typeof validateReferralCodeSchema>;
export type GetReferralTreeInput = z.infer<typeof getReferralTreeSchema>;
export type GetReferralBonusesInput = z.infer<typeof getReferralBonusesSchema>;
