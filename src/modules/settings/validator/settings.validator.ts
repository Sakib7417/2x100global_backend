import { z } from 'zod';

export const createSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(1000),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
});

export const updateSettingSchema = z.object({
  value: z.string().min(1).max(1000),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
});

export type CreateSettingInput = z.infer<typeof createSettingSchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
