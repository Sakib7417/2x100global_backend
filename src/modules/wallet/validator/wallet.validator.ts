import { z } from 'zod';
import { WalletType } from '@prisma/client';

export const getWalletSchema = z.object({
  type: z.nativeEnum(WalletType).optional(),
});

export type GetWalletInput = z.infer<typeof getWalletSchema>;
