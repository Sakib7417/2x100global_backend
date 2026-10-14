import { PrismaClient, CycleBonus, CycleBonusStatus, RankLevel } from '@prisma/client';
import prisma from '../../../config/database';

export class CycleBonusRepository {
  /**
   * Create cycle bonus record
   */
  async create(data: {
    userId: string;
    rankId: string;
    rankLevel: RankLevel;
    cycleNumber: number;
    cycleStartDate: Date;
    cycleEndDate: Date;
    rankBonusAmount: number;
    cycleBonusAmount: number;
    totalAmount: number;
    status: CycleBonusStatus;
    eligibilityData?: any;
  }): Promise<CycleBonus> {
    return prisma.cycleBonus.create({
      data: {
        userId: data.userId,
        rankId: data.rankId,
        rankLevel: data.rankLevel,
        cycleNumber: data.cycleNumber,
        cycleStartDate: data.cycleStartDate,
        cycleEndDate: data.cycleEndDate,
        rankBonusAmount: data.rankBonusAmount,
        cycleBonusAmount: data.cycleBonusAmount,
        totalAmount: data.totalAmount,
        status: data.status,
        eligibilityData: data.eligibilityData || {},
      },
      include: {
        user: true,
        rank: true,
      },
    });
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<CycleBonus | null> {
    return prisma.cycleBonus.findUnique({
      where: { id },
      include: {
        user: true,
        rank: true,
      },
    });
  }

  /**
   * Find latest cycle bonus for user
   */
  async findLatestByUserId(userId: string): Promise<CycleBonus | null> {
    return prisma.cycleBonus.findFirst({
      where: { userId },
      orderBy: { cycleNumber: 'desc' },
    });
  }

  /**
   * Find cycle bonuses by user ID
   */
  async findByUserId(
    userId: string,
    options: {
      status?: CycleBonusStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ cycleBonuses: CycleBonus[]; total: number }> {
    const { status, page = 1, limit = 10 } = options;

    const where: any = { userId };
    if (status) where.status = status;

    const [cycleBonuses, total] = await Promise.all([
      prisma.cycleBonus.findMany({
        where,
        include: {
          rank: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cycleBonus.count({ where }),
    ]);

    return { cycleBonuses, total };
  }

  /**
   * Find all cycle bonuses (admin)
   */
  async findAll(options: {
    status?: CycleBonusStatus;
    page?: number;
    limit?: number;
  } = {}): Promise<{ cycleBonuses: CycleBonus[]; total: number }> {
    const { status, page = 1, limit = 10 } = options;

    const where: any = {};
    if (status) where.status = status;

    const [cycleBonuses, total] = await Promise.all([
      prisma.cycleBonus.findMany({
        where,
        include: {
          user: true,
          rank: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cycleBonus.count({ where }),
    ]);

    return { cycleBonuses, total };
  }

  /**
   * Mark cycle bonus as credited
   */
  async markAsCredited(id: string): Promise<CycleBonus> {
    return prisma.cycleBonus.update({
      where: { id },
      data: {
        status: CycleBonusStatus.CREDITED,
        creditedAt: new Date(),
      },
    });
  }
}

export const cycleBonusRepository = new CycleBonusRepository();
export default cycleBonusRepository;
