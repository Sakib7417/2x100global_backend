import { WalletType } from '@prisma/client';

export interface WalletDTO {
  id: string;
  userId: string;
  type: WalletType;
  balance: string;
  totalCredit: string;
  totalDebit: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletBalanceDTO {
  type: WalletType;
  balance: string;
  totalCredit: string;
  totalDebit: string;
}

export interface TransferDTO {
  fromWalletType: WalletType;
  toWalletType: WalletType;
  amount: string;
}

export interface WalletSummaryDTO {
  principal: WalletBalanceDTO;
  depositBonus: WalletBalanceDTO;
  referral: WalletBalanceDTO;
  tradingProfit: WalletBalanceDTO;
  rankBonus: WalletBalanceDTO;
  cycleBonus: WalletBalanceDTO;
  adminCommission: WalletBalanceDTO;
  totalBalance: string;
}
