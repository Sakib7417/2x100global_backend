import { CycleBonusStatus } from '@prisma/client';

export interface CycleBonusDTO {
  id: string;
  userId: string;
  cycleNumber: number;
  startDate: Date;
  endDate: Date;
  totalVolume: string;
  bonusAmount: string;
  status: CycleBonusStatus;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CycleBonusQueryDTO {
  status?: CycleBonusStatus;
  cycleNumber?: number;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface CycleBonusConfigDTO {
  cycleDuration: number; // in days
  minVolume: number;
  bonusPercentage: number;
  maxBonus: number;
}
