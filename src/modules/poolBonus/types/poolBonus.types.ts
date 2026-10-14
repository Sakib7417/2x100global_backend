import { PoolBonusRequestStatus, PoolBonusRequestType } from '@prisma/client';

export interface CreatePoolBonusRequestDTO {
  requestType: PoolBonusRequestType;
  requestedAmount: number;
  destinationAddress?: string;
  network?: string;
  withdrawPassword: string;
}

export interface PoolBonusRequestQueryDTO {
  status?: PoolBonusRequestStatus;
  requestType?: PoolBonusRequestType;
  page?: number;
  limit?: number;
}

export interface ApprovePoolBonusRequestDTO {
  adminNote?: string;
}

export interface UpdatePoolBonusRequestDTO {
  approvedAmount: number;
  adminNote?: string;
}

export interface RejectPoolBonusRequestDTO {
  rejectionReason: string;
}

export interface PoolBonusRequestResult {
  id: string;
  userId: string;
  requestType: PoolBonusRequestType;
  requestedAmount: string;
  approvedAmount: string | null;
  status: PoolBonusRequestStatus;
  destinationAddress: string | null;
  network: string | null;
  rejectionReason: string | null;
  adminNote: string | null;
  approvedAt: Date | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
