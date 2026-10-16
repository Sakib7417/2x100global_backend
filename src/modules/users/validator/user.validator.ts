import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(5).max(20).optional(),
  country: z.string().min(2).max(100).optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export const setWithdrawPasswordSchema = z.object({
  withdrawPassword: z
    .string()
    .min(8, 'Withdraw password must be at least 8 characters')
    .max(100)
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Withdraw password must contain letters and numbers'),
  otp: z
    .string()
    .regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SetWithdrawPasswordInput = z.infer<typeof setWithdrawPasswordSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
