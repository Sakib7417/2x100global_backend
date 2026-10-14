import { BlockchainTransactionType, BlockchainTransactionStatus } from '@prisma/client';

export interface BlockchainTransactionDTO {
  id: string;
  transactionHash: string;
  type: BlockchainTransactionType;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenContract: string;
  network: string;
  blockNumber?: string;
  confirmations: number;
  status: BlockchainTransactionStatus;
  rawTransaction?: any;
  receipt?: any;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface VerifyTransactionDTO {
  transactionHash: string;
  fromAddress?: string;
  toAddress: string;
  amount: string;
  tokenContract: string;
  network: string;
}

export interface TransferEvent {
  from: string;
  to: string;
  value: bigint;
  transactionHash: string;
  blockNumber: bigint;
  logIndex: number;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: bigint;
  from: string;
  to: string;
  status: number;
  confirmations: number;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  logs: any[];
}
