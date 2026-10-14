import { TradeStatus, TradeType } from '@prisma/client';

export interface ExecuteTradeDTO {
  tradeType: TradeType;
}

export interface TradeQueryDTO {
  status?: TradeStatus;
  tradeType?: TradeType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface TradeStatsResult {
  totalTrades: number;
  totalVolume: number;
  totalUserProfit: number;
  totalAdminCommission: number;
  completedTrades: number;
  pendingTrades: number;
}

export interface RecentTrade {
  id: string;
  tradeAmount: string;
  profit: string;
  profitPercentage: number;
  tradeType: TradeType;
  entryTime: Date;
  exitTime: Date;
}
