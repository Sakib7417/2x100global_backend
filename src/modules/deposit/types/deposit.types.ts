import { DepositStatus } from '@prisma/client';

export interface DepositDTO {
  id: string;
  userId: string;
  amount: string;
  transactionHash: string;
  senderAddress: string;
  receiverAddress: string;
  tokenContract: string;
  network: string;
  blockNumber?: string;
  confirmations: number;
  requiredConfirmations: number;
  status: DepositStatus;
  bonusAmount: string;
  blockchainData?: any;
  verifiedAt?: Date;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepositDTO {
  amount: string;
  transactionHash: string;
  senderAddress: string;
  receiverAddress: string;
  tokenContract: string;
  network: string;
}

export interface DepositQueryDTO {
  status?: DepositStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}
