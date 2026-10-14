import { PrismaClient, Trade, TradeStatus, TradeType, User } from '@prisma/client';
import prisma from '../../../config/database';
import type { RecentTrade } from '../types/trading.types';

export class TradingRepository {
  /**
   * Create new trade
   */
  async create(data: {
    userId: string;
    sessionId?: string;
    tradeAmount: number;
    tradeType: TradeType;
    status: TradeStatus;
    entryTime: Date;
    settlementTime: Date;
    metadata?: any;
  }): Promise<Trade> {
    return prisma.trade.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        tradeAmount: data.tradeAmount,
        tradeType: data.tradeType,
        status: data.status,
        entryTime: data.entryTime,
        settlementTime: data.settlementTime,
        metadata: data.metadata || {},
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find trade by ID
   */
  async findById(id: string): Promise<Trade | null> {
    return prisma.trade.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find pending trades ready for settlement (settlementTime <= now)
   */
  async findPendingTradesToSettle(): Promise<(Trade & { user: User })[]> {
    return prisma.trade.findMany({
      where: {
        status: TradeStatus.PENDING,
        settlementTime: {
          lte: new Date(),
        },
      },
      include: {
        user: true,
      },
      orderBy: { entryTime: 'asc' },
    });
  }

  /**
   * Find trades by user ID
   */
  async findByUserId(
    userId: string,
    options: {
      status?: TradeStatus;
      tradeType?: TradeType;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ trades: Trade[]; total: number }> {
    const { status, tradeType, startDate, endDate, page = 1, limit = 10 } = options;

    const where: any = { userId };

    if (status) where.status = status;
    if (tradeType) where.tradeType = tradeType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.trade.count({ where }),
    ]);

    return { trades, total };
  }

  /**
   * Find all trades (admin)
   */
  async findAll(options: {
    status?: TradeStatus;
    tradeType?: TradeType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{ trades: Trade[]; total: number }> {
    const { status, tradeType, startDate, endDate, page = 1, limit = 10 } = options;

    const where: any = {};

    if (status) where.status = status;
    if (tradeType) where.tradeType = tradeType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.trade.count({ where }),
    ]);

    return { trades, total };
  }

  /**
   * Update trade settlement only if it is still pending.
   * Returns null if the trade was already settled by another process.
   */
  async settleTrade(
    id: string,
    data: {
      status: TradeStatus;
      profit: number;
      commission: number;
      profitPercentage: number;
      exitTime: Date;
    }
  ): Promise<Trade | null> {
    const { count } = await prisma.trade.updateMany({
      where: { id, status: TradeStatus.PENDING },
      data: {
        status: data.status,
        profit: data.profit,
        commission: data.commission,
        profitPercentage: data.profitPercentage,
        exitTime: data.exitTime,
      },
    });

    if (count === 0) return null;

    return prisma.trade.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  /**
   * Find recent completed trades for public activity feed.
   */
  async findRecent(limit = 20): Promise<RecentTrade[]> {
    const trades = await prisma.trade.findMany({
      where: { status: TradeStatus.COMPLETED },
      orderBy: { exitTime: 'desc' },
      take: limit,
      select: {
        id: true,
        tradeAmount: true,
        profit: true,
        profitPercentage: true,
        tradeType: true,
        entryTime: true,
        exitTime: true,
      },
    });

    return trades.map((trade) => ({
      id: trade.id,
      tradeAmount: trade.tradeAmount.toString(),
      profit: trade.profit.toString(),
      profitPercentage: trade.profitPercentage ? Number(trade.profitPercentage) : 0,
      tradeType: trade.tradeType,
      entryTime: trade.entryTime,
      exitTime: trade.exitTime ?? trade.entryTime,
    }));
  }

  /**
   * Get trade statistics
   */
  async getStatistics(userId?: string): Promise<{
    totalTrades: number;
    totalVolume: number;
    totalUserProfit: number;
    totalAdminCommission: number;
    completedTrades: number;
    pendingTrades: number;
  }> {
    const where = userId ? { userId } : {};

    const [totalTrades, volumeAgg, profitAgg, commAgg, completedTrades, pendingTrades] = await Promise.all([
      prisma.trade.count({ where }),
      prisma.trade.aggregate({
        where,
        _sum: { tradeAmount: true },
      }),
      prisma.trade.aggregate({
        where: { ...where, status: TradeStatus.COMPLETED },
        _sum: { profit: true },
      }),
      prisma.trade.aggregate({
        where: { ...where, status: TradeStatus.COMPLETED },
        _sum: { commission: true },
      }),
      prisma.trade.count({
        where: { ...where, status: TradeStatus.COMPLETED },
      }),
      prisma.trade.count({
        where: { ...where, status: TradeStatus.PENDING },
      }),
    ]);

    return {
      totalTrades,
      totalVolume: Number(volumeAgg._sum.tradeAmount || 0),
      totalUserProfit: Number(profitAgg._sum.profit || 0),
      totalAdminCommission: Number(commAgg._sum.commission || 0),
      completedTrades,
      pendingTrades,
    };
  }
}

export const tradingRepository = new TradingRepository();
export default tradingRepository;
