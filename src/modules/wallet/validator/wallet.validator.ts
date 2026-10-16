import { z } from 'zod';
import { WalletType } from '@prisma/client';

export const getWalletSchema = z.object({
  type: z.nativeEnum(WalletType).optional(),
});

/** Wallets a user can move into PRINCIPAL as new stake. */
export const TRANSFERABLE_SOURCES = [
  'REFERRAL',
  'POOL_BONUS',
  'RANK_BONUS',
  'TRADING_PROFIT',
  'DEPOSIT_BONUS',
] as const;

export const transferToPrincipalSchema = z.object({
  sourceWallet: z.enum(TRANSFERABLE_SOURCES),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
});

export type GetWalletInput = z.infer<typeof getWalletSchema>;
export type TransferToPrincipalInput = z.infer<typeof transferToPrincipalSchema>;
