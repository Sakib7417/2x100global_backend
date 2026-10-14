import { z } from 'zod';

export const verifyTransactionSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  fromAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid from address').optional(),
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid to address'),
  amount: z.string().refine((val) => parseFloat(val) > 0, 'Amount must be greater than zero'),
  tokenContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token contract'),
  network: z.string(),
});

export const getBalanceSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  network: z.string().optional(),
});

export const getTokenBalanceSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  tokenContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token contract'),
  network: z.string().optional(),
});

export type VerifyTransactionInput = z.infer<typeof verifyTransactionSchema>;
export type GetBalanceInput = z.infer<typeof getBalanceSchema>;
export type GetTokenBalanceInput = z.infer<typeof getTokenBalanceSchema>;
