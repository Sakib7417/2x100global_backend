import { LedgerType, ReferenceType } from '@prisma/client';

export interface LedgerDTO {
  id: string;
  userId: string;
  walletId: string;
  type: LedgerType;
  referenceId?: string;
  referenceType?: ReferenceType;
  beforeBalance: string;
  afterBalance: string;
  credit: string;
  debit: string;
  description?: string;
  metadata?: any;
  createdAt: Date;
}

export interface CreateLedgerDTO {
  userId: string;
  walletId: string;
  type: LedgerType;
  credit: number;
  debit: number;
  beforeBalance: number;
  afterBalance: number;
  description?: string;
  referenceId?: string;
  referenceType?: ReferenceType;
  metadata?: any;
}

export interface LedgerQueryDTO {
  type?: LedgerType;
  walletId?: string;
  referenceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}
